package tools

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
)

func CheckIndexes() {
	dbURL := "postgres://devdeck:devdeck_local_pass@localhost:5432/devdeck?sslmode=disable"
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(context.Background())

	rows, err := conn.Query(context.Background(), "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users';")
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	fmt.Println("Indexes on users table:")
	for rows.Next() {
		var indexname, indexdef string
		if err := rows.Scan(&indexname, &indexdef); err != nil {
			panic(err)
		}
		fmt.Printf("%s: %s\n", indexname, indexdef)
	}
}
