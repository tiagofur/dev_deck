package tools

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
)

func CheckConstraints() {
	dbURL := "postgres://devdeck:devdeck_local_pass@localhost:5432/devdeck?sslmode=disable"
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(context.Background())

	rows, err := conn.Query(context.Background(), "SELECT conname FROM pg_constraint WHERE conrelid = 'users'::regclass;")
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	fmt.Println("Constraints on users table:")
	for rows.Next() {
		var conname string
		if err := rows.Scan(&conname); err != nil {
			panic(err)
		}
		fmt.Println(conname)
	}
}
