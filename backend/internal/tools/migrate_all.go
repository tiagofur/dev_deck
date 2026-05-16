package tools

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"sort"

	"github.com/jackc/pgx/v5"
)

func MigrateAll() {
	dbURL := "postgres://devdeck:devdeck_local_pass@localhost:5432/devdeck?sslmode=disable"
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer conn.Close(context.Background())

	files, err := filepath.Glob("migrations/*.sql")
	if err != nil {
		panic(err)
	}
	sort.Strings(files)

	for _, file := range files {
		sqlBytes, err := ioutil.ReadFile(file)
		if err != nil {
			panic(err)
		}
		_, err = conn.Exec(context.Background(), string(sqlBytes))
		if err != nil {
			fmt.Printf("Error running %s: %v\n", file, err)
			// Ignore errors like "already exists" for now
		} else {
			fmt.Printf("Successfully applied %s\n", file)
		}
	}
}
