// Options page — lets the user set the backend URL + token. We verify
// the token by hitting /healthz before persisting when the user clicks
// "Probar conexión" so a fat-fingered paste fails loudly.

import { health } from './lib/api.js'
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
  if (!apiUrl) {
    showError('Falta la URL del backend.')
    return
  }
  try {
    await health(apiUrl)
    showSuccess('✓ Backend alcanzable.')
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
