package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"side_wall/canvas"
	"side_wall/utils"

	_ "github.com/go-sql-driver/mysql"
	"github.com/gorilla/websocket"
)

// TODO: stuur het hele canvas naar de niewue connectie

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

	// establish database connection
	dsn := "root:lordofthegame666@tcp(127.0.0.1:3306)/sidewall2"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fmt.Println(err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		fmt.Println(err)
	}

	var line canvas.Line
	for {
		var msg utils.MessageDTO

		err := conn.ReadJSON(&msg)
		if err != nil {
			fmt.Println(err)
			break
		}

		tx, err := db.Begin()
		if err != nil {
			fmt.Println(err)
		}

		if msg.LineId == line.Id { // NOTE: We collect all the points first and when a line ends, we add it to the database. so that we know the length of the line
			line.AddPoint(msg)
		} else if len(line.Points) > 0 { // NOTE: if the id's dont match check if we have points left from the previous line, if so, insert them with the line and line length

			line.Length = len(line.Points)

			err := line.InsertLine(tx)
			if err != nil {
				fmt.Println(err)
			}

			err = line.InsertPointPool(tx)
			if err != nil {
				fmt.Println(err)
			}

			line.NewLine(msg)
			line.AddPoint(msg)

		} else { // NOTE: if the the ids dont match and there are no points, it is the first line, so create a new line and add the point
			line.NewLine(msg)
			line.AddPoint(msg)
		}

		err = tx.Commit()
		if err != nil {
			fmt.Println(err)
		}

		// TODO: Send points to other clients

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
