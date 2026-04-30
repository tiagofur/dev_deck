// Options page — lets the user set the backend URL + token. We verify
// both backend reachability and auth by hitting a protected endpoint
// before persisting when the user clicks "Probar conexión".

import { verifyAuth } from './lib/api.js'
import { getSettings, setSettings } from './lib/storage.js'

const $ = (id) => document.getElementById(id)

async function init() {
  const { apiUrl, token } = await getSettings()
  $('api-url').value = apiUrl
  $('token').value = token

  $('verify').addEventListener('click', onVerify)
  $('save').addEventListener('click', onSave)
}

async function onVerify() {
  clearMessages()
  const apiUrl = $('api-url').value.trim()
  const token = $('token').value.trim()
  if (!apiUrl) {
    showError('Falta la URL del backend.')
    return
  }
  if (!token) {
    showError('Falta el token/JWT.')
    return
  }
  try {
    await verifyAuth(apiUrl, token)
    showSuccess('✓ Backend y credenciales válidas.')
  } catch (err) {
    showError(`✗ ${err.message}`)
  }
}

async function onSave() {
  clearMessages()
  const apiUrl = $('api-url').value.trim().replace(/\/+$/, '')
  const token = $('token').value.trim()
  if (!apiUrl || !token) {
    showError('Necesitamos URL y token.')
    return
  }
  await setSettings({ apiUrl, token })
  showSuccess('✓ Guardado.')
}

function clearMessages() {
  $('error').hidden = true
  $('success').hidden = true
}

function showError(msg) {
  $('error').hidden = false
  $('error').textContent = msg
}

function showSuccess(msg) {
  $('success').hidden = false
  $('success').textContent = msg
}

init()
