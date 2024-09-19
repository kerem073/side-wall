package main

import (
	"database/sql"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

type Point struct {
	X             int    `json:"x"`
	Y             int    `json:"y"`
	Order         int    `json:"order"`
	Lid           string `json:"lid"`
	LineColor     string `json:"lcolor"`
	LineThickness int    `json:"lthickness"`
	Date          string `json:"date"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func saveUserPoints(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	dsn := "root:lordofthegame666@tcp(127.0.0.1:3306)/sidewall"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fmt.Println(err)
	}
	defer db.Close()

	for {
		var point Point
		err := conn.ReadJSON(&point)
		if err != nil {
			fmt.Println(err)
		}

		err = db.Ping()
		if err != nil {
			fmt.Println(err)
		}

		query := "INSERT INTO points (X, Y, OrderNumber, Lid, LineColor, LineThickness, Date) VALUES (?, ?, ?, ?, ?, ?, ?);"

		result, err := db.Exec(query, point.X, point.Y, point.Order, point.Lid, point.LineColor, point.LineThickness, point.Date)
		if err != nil {
			fmt.Println(err)
		}

		lastId, err := result.LastInsertId()
		if err != nil {
			fmt.Println(err)
		}
		fmt.Printf("ID inserted: %d\n", lastId)

		// TODO: Send points to other clients
		conn.WriteJSON(&point)

	}
}

func main() {
	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)
	http.HandleFunc("/point", saveUserPoints)

	log.Print("Listening on :3000")
	err := http.ListenAndServe(":3000", nil)
	if err != nil {
		log.Fatal(err)
	}

}
