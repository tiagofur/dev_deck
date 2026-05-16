package tools

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"

	"github.com/jackc/pgx/v5"
)

func Apply0019() {
	dbURL := "postgres://devdeck:devdeck_local_pass@localhost:5432/devdeck?sslmode=disable"
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(context.Background())

	sqlBytes, err := ioutil.ReadFile("migrations/0019_fix_local_auth.sql")
	if err != nil {
		panic(err)
	}
	_, err = conn.Exec(context.Background(), string(sqlBytes))
	if err != nil {
		panic(fmt.Sprintf("Error running 0019: %v", err))
	}
	fmt.Println("Applied successfully")
}
