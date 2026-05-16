package tools

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
)

func CheckColumns() {
	dbURL := "postgres://devdeck:devdeck_local_pass@localhost:5432/devdeck?sslmode=disable"
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(context.Background())

	rows, err := conn.Query(context.Background(), "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';")
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	fmt.Println("Columns on users table:")
	for rows.Next() {
		var col, typ string
		if err := rows.Scan(&col, &typ); err != nil {
			panic(err)
		}
		fmt.Printf("%s (%s)\n", col, typ)
	}
}
