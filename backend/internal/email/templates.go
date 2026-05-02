package email

import (
	"fmt"
)

func VerificationEmail(link string) string {
	return fmt.Sprintf(`
		<div style="font-family: 'Courier New', Courier, monospace; max-width: 500px; margin: 40px auto; border: 4px solid #1a1a1a; padding: 40px; background-color: #ffffff; box-shadow: 10px 10px 0px 0px #1a1a1a;">
			<h1 style="text-transform: uppercase; font-weight: 900; margin-top: 0; font-size: 32px;">Dev<span style="background-color: #FF7EB6; padding: 0 8px; border: 2px solid #1a1a1a;">Deck</span></h1>
			<p style="font-weight: bold; font-size: 18px;">¡Casi estás adentro!</p>
			<p>Gracias por sumarte. Verificá tu cuenta para empezar a guardar tu memoria de dev.</p>
			<div style="margin: 40px 0;">
				<a href="%s" style="display: inline-block; background-color: #33A1FD; color: white; padding: 16px 32px; text-decoration: none; border: 3px solid #1a1a1a; font-weight: bold; box-shadow: 4px 4px 0px 0px #1a1a1a; text-transform: uppercase;">Verificar Email</a>
			</div>
			<p style="font-size: 12px; color: #666;">Este link expira en 24 horas.</p>
			<p style="font-size: 12px; color: #666;">Si no creaste esta cuenta, ignorá este mensaje.</p>
		</div>
	`, link)
}

func PasswordResetEmail(link string) string {
	return fmt.Sprintf(`
		<div style="font-family: 'Courier New', Courier, monospace; max-width: 500px; margin: 40px auto; border: 4px solid #1a1a1a; padding: 40px; background-color: #ffffff; box-shadow: 10px 10px 0px 0px #1a1a1a;">
			<h1 style="text-transform: uppercase; font-weight: 900; margin-top: 0; font-size: 32px;">Dev<span style="background-color: #FF7EB6; padding: 0 8px; border: 2px solid #1a1a1a;">Deck</span></h1>
			<p style="font-weight: bold; font-size: 18px;">¿Te olvidaste la pass?</p>
			<p>No pasa nada. Hacé clic abajo para elegir una nueva y volver al código.</p>
			<div style="margin: 40px 0;">
				<a href="%s" style="display: inline-block; background-color: #A5FFD6; color: #1a1a1a; padding: 16px 32px; text-decoration: none; border: 3px solid #1a1a1a; font-weight: bold; box-shadow: 4px 4px 0px 0px #1a1a1a; text-transform: uppercase;">Resetear Password</a>
			</div>
			<p style="font-size: 12px; color: #666;">Este link expira en 1 hora.</p>
			<p style="font-size: 12px; color: #666;">Si no pediste esto, ignoralo; nada va a cambiar.</p>
		</div>
	`, link)
}
