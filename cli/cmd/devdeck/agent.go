package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"devdeck-cli/internal/apiclient"

	"github.com/spf13/cobra"
)

var agentCmd = &cobra.Command{
	Use:   "agent",
	Short: "Chat with your DevDeck AI Agent",
	Long:  `Start an interactive session with the AI agent to search, organize, or explore your knowledge vault.`,
	RunE:  runAgent,
}

func runAgent(cmd *cobra.Command, args []string) error {
	client, _, err := loadClient()
	if err != nil {
		return err
	}

	fmt.Println("🤖 DevDeck AI Agent (v1.0)")
	fmt.Println("Escribí 'exit' o 'quit' para salir.")
	fmt.Println()

	scanner := bufio.NewScanner(os.Stdin)
	var history []apiclient.Message

	for {
		fmt.Print("YOU > ")
		if !scanner.Scan() {
			break
		}

		input := strings.TrimSpace(scanner.Text())
		if input == "" {
			continue
		}
		if input == "exit" || input == "quit" {
			break
		}

		history = append(history, apiclient.Message{Role: "user", Content: input})

		fmt.Print("AI  > Pensando...")
		res, err := client.AgentChat(cmd.Context(), apiclient.AgentChatInput{History: history})
		if err != nil {
			fmt.Printf("\rAI  > ❌ Error: %v\n", err)
			continue
		}

		// Clear "Pensando..." and print response
		fmt.Print("\r")
		history = res.History
		lastMsg := history[len(history)-1]
		fmt.Printf("AI  > %s\n\n", lastMsg.Content)
	}

	return nil
}
