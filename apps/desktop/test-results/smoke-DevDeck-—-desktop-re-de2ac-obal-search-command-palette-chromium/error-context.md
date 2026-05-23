# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> DevDeck — desktop renderer E2E >> 5. command palette: Ctrl+K opens global search command palette
- Location: tests/e2e/smoke.spec.ts:123:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('DevDeck').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByLabel('DevDeck').first()

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - heading "DevDeck" [level=1] [ref=e5]
  - paragraph [ref=e6]: Your external memory for development.
  - generic [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Email
        - textbox "you@email.com" [active] [ref=e11]
      - button "Continue" [ref=e12] [cursor=pointer]:
        - img [ref=e13]
        - text: Continue
    - generic [ref=e15]:
      - link "Forgot your password?" [ref=e16] [cursor=pointer]:
        - /url: "#/forgot-password"
      - link "Create account" [ref=e17] [cursor=pointer]:
        - /url: "#/register"
  - generic [ref=e22]: or continue with
  - button "Log in with GitHub" [ref=e24] [cursor=pointer]:
    - img [ref=e25]
```

# Test source

```ts
  25  |         const body = await res.json()
  26  |         clearTimeout(timeoutId)
  27  |         return { status: res.status, body }
  28  |       } catch (e: any) {
  29  |         return { error: e.message }
  30  |       }
  31  |     }, { url: apiUrl, token: apiToken })
  32  |     console.log('API Auth Check Response:', JSON.stringify(response))
  33  |     expect(response.status).toBe(200)
  34  |     expect(response.body.login).toBe('devdeck-test')
  35  |   })
  36  | 
  37  |   test('1. token-mode auth bypass: home loads without OAuth', async ({ page }) => {
  38  |     // In token mode there is no /login page; the items vault page should render.
  39  |     // Wait for the URL to settle at / (it might bounce through /login)
  40  |     await expect(page).toHaveURL(/\//, { timeout: 15_000 })
  41  |     await expect(page).toHaveTitle(/DevDeck/i, { timeout: 15_000 })
  42  |     // DevDeck title heading on ItemsPage is visible.
  43  |     await expect(page.getByLabel('DevDeck').first()).toBeVisible({ timeout: 20_000 })
  44  |   })
  45  | 
  46  |   test('2. capture item: opens modal, submits, sees the new card', async ({ page }) => {
  47  |     test.setTimeout(60_000)
  48  |     // Open the capture modal using the visible header action.
  49  |     await page.getByRole('button', { name: /capture/i }).click()
  50  |     const urlInput = page.getByPlaceholder(/github\.com\/owner\/repo/i)
  51  |     await expect(urlInput).toBeVisible()
  52  |     
  53  |     const uniqueUrl = `https://github.com/test-${Date.now()}/sample`
  54  |     await urlInput.fill(uniqueUrl)
  55  |     
  56  |     // We expect the "Save" button to be enabled once input is populated.
  57  |     const submitButton = page.getByRole('button', { name: /save/i })
  58  |     await expect(submitButton).toBeEnabled()
  59  |     
  60  |     const createResponsePromise = page.waitForResponse(
  61  |       (response) =>
  62  |         response.url().includes('/api/items/capture') &&
  63  |         response.request().method() === 'POST',
  64  |       { timeout: 15_000 },
  65  |     )
  66  |     await submitButton.click()
  67  |     const createResponse = await createResponsePromise
  68  |     
  69  |     expect(createResponse, 'item capture request never received a response').not.toBeNull()
  70  |     const createBody = await createResponse.text()
  71  |     expect(createResponse.status(), createBody).toBe(201)
  72  |     
  73  |     // Close the success/confirm capture view.
  74  |     await page.getByRole('button', { name: /close/i }).first().click()
  75  |     
  76  |     // Verify the new item card is now rendered in the list.
  77  |     await page.reload()
  78  |     await expect(page.getByText(/sample/i).first()).toBeVisible({ timeout: 10_000 })
  79  |   })
  80  | 
  81  |   test('3. item detail + notes: navigate to a card, edit notes, persist', async ({ page }) => {
  82  |     // Click the first card on the items list (seeded by test 2).
  83  |     const firstCard = page.getByRole('article').first()
  84  |     if (await firstCard.count() === 0) {
  85  |       test.skip(true, 'no items available — seed the database first')
  86  |     }
  87  |     await firstCard.click()
  88  |     
  89  |     // Wait for the detail view notes editor. Since we click first card,
  90  |     // if there are no notes, click "No notes. Click to start writing." 
  91  |     // or the "Edit" notes button.
  92  |     const editNotesBtn = page.getByRole('button', { name: /edit/i }).nth(2)
  93  |     const sinNotasBtn = page.getByRole('button', { name: /no notes/i })
  94  |     
  95  |     if (await sinNotasBtn.count() > 0) {
  96  |       await sinNotasBtn.click()
  97  |     } else {
  98  |       await editNotesBtn.click()
  99  |     }
  100 |     
  101 |     // Interact with the textarea.
  102 |     const notesTextarea = page.getByPlaceholder(/write your notes in markdown/i)
  103 |     await expect(notesTextarea).toBeVisible()
  104 |     const noteText = 'e2e-test-note-' + Date.now()
  105 |     await notesTextarea.fill(noteText)
  106 |     
  107 |     // Save the note.
  108 |     await page.getByRole('button', { name: /save/i }).click()
  109 |     
  110 |     // The note should render under markdown view.
  111 |     await expect(page.getByText(noteText)).toBeVisible({ timeout: 10_000 })
  112 |   })
  113 | 
  114 |   test('4. search: inline input filters items', async ({ page }) => {
  115 |     const searchInput = page.getByPlaceholder(/Search items/i)
  116 |     await expect(searchInput).toBeVisible()
  117 |     await searchInput.fill('sample')
  118 |     await page.waitForTimeout(500)
  119 |     // The items list should be filtered. Verify page doesn't crash and is visible.
  120 |     await expect(page.locator('body')).toBeVisible()
  121 |   })
  122 | 
  123 |   test('5. command palette: Ctrl+K opens global search command palette', async ({ page }) => {
  124 |     // Wait for page to be fully loaded and hydrated
> 125 |     await expect(page.getByLabel('DevDeck').first()).toBeVisible({ timeout: 15_000 })
      |                                                      ^ Error: expect(locator).toBeVisible() failed
  126 |     // Trigger the global shortcut
  127 |     await page.keyboard.press('Control+k')
  128 |     // Command palette action should be visible.
  129 |     await expect(page.getByText(/ask ai/i)).toBeVisible({ timeout: 10_000 })
  130 |   })
  131 | })
  132 | 
```