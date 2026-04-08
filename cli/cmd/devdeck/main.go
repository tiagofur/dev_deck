// devdeck is the CLI companion to the DevDeck desktop/web clients.
// It's a thin client over the /api/items/capture, /api/search, and
// /api/repos endpoints — enough to capture knowledge from terminal
// workflows without opening the app.
//
// See docs/CAPTURE.md §Canal 2 for the end-to-end spec.
package main

import (
	"fmt"
	"os"
)

func main() {
	if err := rootCmd.Execute(); err != nil {
		// Cobra already prints the error; just exit non-zero.
		fmt.Fprintln(os.Stderr)
		os.Exit(1)
	}
}
