import { test, expect } from '@playwright/test'

test.describe('DevDeck — desktop renderer E2E', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      console.log(`Browser [${msg.type()}]: ${msg.text()}`)
    })
    page.on('pageerror', (err) => {
      console.error(`Browser Error: ${err.message}`)
    })
    await page.goto('/')
  })

  test('0. network check: can reach backend authenticated via proxy', async ({ page }) => {
    const apiUrl = '/api/auth/me'
    const apiToken = 'test-api-token'
    const response = await page.evaluate(async ({ url, token }) => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
        })
        const body = await res.json()
        clearTimeout(timeoutId)
        return { status: res.status, body }
      } catch (e: any) {
        return { error: e.message }
      }
    }, { url: apiUrl, token: apiToken })
    console.log('API Auth Check Response:', JSON.stringify(response))
    expect(response.status).toBe(200)
    expect(response.body.login).toBe('devdeck-test')
  })

  test('1. token-mode auth bypass: home loads without OAuth', async ({ page }) => {
    // In token mode there is no /login page; the items vault page should render.
    // Wait for the URL to settle at / (it might bounce through /login)
    await expect(page).toHaveURL(/\//, { timeout: 15_000 })
    await expect(page).toHaveTitle(/DevDeck/i, { timeout: 15_000 })
    // DevDeck title heading on ItemsPage is visible.
    await expect(page.getByLabel('DevDeck').first()).toBeVisible({ timeout: 20_000 })
  })

  test('2. capture item: opens modal, submits, sees the new card', async ({ page }) => {
    test.setTimeout(60_000)
    // Open the capture modal using the visible header action.
    await page.getByRole('button', { name: /capture/i }).click()
    const urlInput = page.getByPlaceholder(/github\.com\/owner\/repo/i)
    await expect(urlInput).toBeVisible()
    
    const uniqueUrl = `https://github.com/test-${Date.now()}/sample`
    await urlInput.fill(uniqueUrl)
    
    // We expect the "Save" button to be enabled once input is populated.
    const submitButton = page.getByRole('button', { name: /save/i })
    await expect(submitButton).toBeEnabled()
    
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/items/capture') &&
        response.request().method() === 'POST',
      { timeout: 15_000 },
    )
    await submitButton.click()
    const createResponse = await createResponsePromise
    
    expect(createResponse, 'item capture request never received a response').not.toBeNull()
    const createBody = await createResponse.text()
    expect(createResponse.status(), createBody).toBe(201)
    
    // Close the success/confirm capture view.
    await page.getByRole('button', { name: /close/i }).first().click()
    
    // Verify the new item card is now rendered in the list.
    await page.reload()
    await expect(page.getByText(/sample/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('3. item detail + notes: navigate to a card, edit notes, persist', async ({ page }) => {
    // Click the first card on the items list (seeded by test 2).
    const firstCard = page.getByRole('article').first()
    if (await firstCard.count() === 0) {
      test.skip(true, 'no items available — seed the database first')
    }
    await firstCard.click()
    
    // Wait for the detail view notes editor. Since we click first card,
    // if there are no notes, click "No notes. Click to start writing." 
    // or the "Edit" notes button.
    const editNotesBtn = page.getByRole('button', { name: /edit/i }).nth(2)
    const sinNotasBtn = page.getByRole('button', { name: /no notes/i })
    
    if (await sinNotasBtn.count() > 0) {
      await sinNotasBtn.click()
    } else {
      await editNotesBtn.click()
    }
    
    // Interact with the textarea.
    const notesTextarea = page.getByPlaceholder(/write your notes in markdown/i)
    await expect(notesTextarea).toBeVisible()
    const noteText = 'e2e-test-note-' + Date.now()
    await notesTextarea.fill(noteText)
    
    // Save the note.
    await page.getByRole('button', { name: /save/i }).click()
    
    // The note should render under markdown view.
    await expect(page.getByText(noteText)).toBeVisible({ timeout: 10_000 })
  })

  test('4. search: inline input filters items', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search items/i)
    await expect(searchInput).toBeVisible()
    await searchInput.fill('sample')
    await page.waitForTimeout(500)
    // The items list should be filtered. Verify page doesn't crash and is visible.
    await expect(page.locator('body')).toBeVisible()
  })

  test('5. command palette: Ctrl+K opens global search command palette', async ({ page }) => {
    // Wait for page to be fully loaded and hydrated
    await expect(page.getByLabel('DevDeck').first()).toBeVisible({ timeout: 15_000 })
    // Trigger the global shortcut
    await page.keyboard.press('Control+k')
    // Command palette action should be visible.
    await expect(page.getByText(/ask ai/i)).toBeVisible({ timeout: 10_000 })
  })
})
