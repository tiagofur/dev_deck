package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"time"

	"devdeck/internal/authctx"
	"devdeck/internal/authservice"
	"devdeck/internal/domain/auth"
	"devdeck/internal/email"
	"devdeck/internal/store"

	"golang.org/x/crypto/bcrypt"
)

type AuthLocalHandler struct {
	store       *store.Store
	authService *authservice.Service
	emailSender email.Sender
	frontendURL string
}

func NewAuthLocalHandler(s *store.Store, as *authservice.Service, es email.Sender, frontendURL string) *AuthLocalHandler {
	return &AuthLocalHandler{
		store:       s,
		authService: as,
		emailSender: es,
		frontendURL: frontendURL,
	}
}

// POST /api/auth/register
func (h *AuthLocalHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req auth.RegisterRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
		return
	}

	if req.Email == "" || len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "email required and password must be at least 8 chars")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		writeInternal(w, err)
		return
	}

	user, err := h.store.CreateUserWithPassword(r.Context(), req.Email, string(hash))
	if err != nil {
		if errors.Is(err, store.ErrAlreadyExists) {
			writeError(w, http.StatusConflict, "EMAIL_TAKEN", "email already registered")
			return
		}
		writeInternal(w, err)
		return
	}

	// Create verification token
	tokenRaw, tokenHash, err := h.generateToken()
	if err != nil {
		writeInternal(w, err)
		return
	}

	if err := h.store.CreateEmailVerificationToken(r.Context(), user.ID, tokenHash, time.Now().Add(24*time.Hour)); err != nil {
		writeInternal(w, err)
		return
	}

	// Send email
	verifyLink := h.frontendURL + "/verify-email?token=" + tokenRaw
	body := email.VerificationEmail(verifyLink)
	_ = h.emailSender.Send(r.Context(), req.Email, "Verifica tu cuenta — DevDeck", body)

	writeJSON(w, http.StatusCreated, map[string]string{"message": "verification email sent"})
}

// POST /api/auth/login
func (h *AuthLocalHandler) LoginLocal(w http.ResponseWriter, r *http.Request) {
	var req auth.LoginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
		return
	}

	user, err := h.store.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
			return
		}
		writeInternal(w, err)
		return
	}

	if user.PasswordHash == nil {
		writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "invalid email or password")
		return
	}

	if !user.EmailVerified {
		writeError(w, http.StatusForbidden, "EMAIL_NOT_VERIFIED", "please verify your email first")
		return
	}

	h.issueTokens(w, r, *user)
}

// GET /api/auth/verify-email
func (h *AuthLocalHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "INVALID_TOKEN", "token required")
		return
	}

	tokenHash := h.hashToken(token)
	userID, err := h.store.ConsumeEmailVerificationToken(r.Context(), tokenHash)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusBadRequest, "INVALID_TOKEN", "invalid or expired token")
			return
		}
		writeInternal(w, err)
		return
	}

	if err := h.store.SetEmailVerified(r.Context(), *userID); err != nil {
		writeInternal(w, err)
		return
	}

	http.Redirect(w, r, h.frontendURL+"/login?verified=true", http.StatusSeeOther)
}

// POST /api/auth/forgot-password
func (h *AuthLocalHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req auth.ForgotPasswordRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
		return
	}

	user, err := h.store.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			// Silent success to prevent email enumeration
			writeJSON(w, http.StatusOK, map[string]string{"message": "if the email exists, a reset link was sent"})
			return
		}
		writeInternal(w, err)
		return
	}

	tokenRaw, tokenHash, err := h.generateToken()
	if err != nil {
		writeInternal(w, err)
		return
	}

	if err := h.store.CreatePasswordResetToken(r.Context(), user.ID, tokenHash, time.Now().Add(1*time.Hour)); err != nil {
		writeInternal(w, err)
		return
	}

	resetLink := h.frontendURL + "/reset-password?token=" + tokenRaw
	body := email.PasswordResetEmail(resetLink)
	_ = h.emailSender.Send(r.Context(), req.Email, "Restablecer contraseña — DevDeck", body)

	writeJSON(w, http.StatusOK, map[string]string{"message": "if the email exists, a reset link was sent"})
}

// POST /api/auth/reset-password
func (h *AuthLocalHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req auth.ResetPasswordRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
		return
	}

	if len(req.NewPassword) < 8 {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "password must be at least 8 chars")
		return
	}

	tokenHash := h.hashToken(req.Token)
	userID, err := h.store.ConsumePasswordResetToken(r.Context(), tokenHash)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusBadRequest, "INVALID_TOKEN", "invalid or expired token")
			return
		}
		writeInternal(w, err)
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		writeInternal(w, err)
		return
	}

	if err := h.store.UpdatePasswordHash(r.Context(), *userID, string(newHash)); err != nil {
		writeInternal(w, err)
		return
	}

	// Revoke all sessions on password reset
	_ = h.store.DeleteAllRefreshSessions(r.Context(), *userID)

	writeJSON(w, http.StatusOK, map[string]string{"message": "password updated"})
}

// POST /api/auth/change-password
func (h *AuthLocalHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, ok := authctx.UserID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "not logged in")
		return
	}

	var req auth.ChangePasswordRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", "invalid request body")
		return
	}

	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		writeInternal(w, err)
		return
	}

	if user.PasswordHash == nil {
		writeError(w, http.StatusBadRequest, "NO_LOCAL_PASSWORD", "account does not have a local password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		writeError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "current password incorrect")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		writeInternal(w, err)
		return
	}

	if err := h.store.UpdatePasswordHash(r.Context(), userID, string(newHash)); err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "password changed"})
}

// Helpers

func (h *AuthLocalHandler) generateToken() (string, string, error) {
	raw, _, err := h.authService.GenerateRefreshToken()
	if err != nil {
		return "", "", err
	}
	return raw, h.hashToken(raw), nil
}

func (h *AuthLocalHandler) hashToken(raw string) string {
	hash := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(hash[:])
}

func (h *AuthLocalHandler) issueTokens(w http.ResponseWriter, r *http.Request, user auth.User) {
	accessToken, expiresAt, err := h.authService.GenerateAccessToken(user)
	if err != nil {
		writeInternal(w, err)
		return
	}

	refreshToken, refreshHash, err := h.authService.GenerateRefreshToken()
	if err != nil {
		writeInternal(w, err)
		return
	}

	err = h.store.CreateRefreshSession(r.Context(), user.ID, refreshHash, h.authService.RefreshExpiry())
	if err != nil {
		writeInternal(w, err)
		return
	}

	writeJSON(w, http.StatusOK, auth.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    expiresAt,
	})
}
