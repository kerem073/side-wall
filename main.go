package main

import (
	"database/sql"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// TODO: TIME FOR REFECTOR INTO MODULES + en structs
// TODO: stuur het hele canvas naar de niewue connectie

type Line struct {
	Id        string `json:"id"`
	Length    int    `json:"length"`
	Color     string `json:"color"`
	Thickness int    `json:"thickness"`
	Points    []Point
}

type Point struct {
	X           int    `json:"x"`
	Y           int    `json:"y"`
	OrderNumber int    `json:"order_number"`
	LineId      string `json:"line_id"`
	DateTime    string `json:"datetime"`
}

type MessageDTO struct {
	X             int    `json:"x"`
	Y             int    `json:"y"`
	OrderNumber   int    `json:"order_number"`
	LineId        string `json:"line_id"`
	LineColor     string `json:"line_color"`
	LineThickness int    `json:"line_thickness"`
	DateTime      string `json:"datetime"`
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

	// dsn := "root:lordofthegame666@tcp(127.0.0.1:3306)/sidewall"
	dsn := "root:lordofthegame666@tcp(127.0.0.1:3306)/sidewall2"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fmt.Println(err)
	}
	defer db.Close()

	var line Line
	for {
		var msg MessageDTO

		err := conn.ReadJSON(&msg)
		if err != nil {
			fmt.Println(err)
			break
		}

		err = db.Ping()
		if err != nil {
			fmt.Println(err)
		}

		tx, err := db.Begin()
		if err != nil {
			fmt.Println(err)
		}

		// NOTE: We collect all the points first. after that, when we get a new lineId, we add the line_length and insert it into the database.
		if msg.LineId == line.Id {
			var point Point
			point.X = msg.X
			point.Y = msg.Y
			point.DateTime = msg.DateTime
			point.OrderNumber = msg.OrderNumber
			point.LineId = msg.LineId
			line.Points = append(line.Points, point) // TODO: Make method in Line for creating point and adding into points.
		} else if len(line.Points) > 0 {

			line.Length = len(line.Points)

			lineQuery := "INSERT INTO lines_details (line_id, line_length, line_color, line_thickness) VALUES (?, ?, ?, ?);"
			_, err = tx.Exec(lineQuery, line.Id, line.Length, line.Color, line.Thickness)
			if err != nil {
				tx.Rollback()
				fmt.Println(err)
			}

			for _, point := range line.Points {
				pointQuery := "INSERT INTO points (x, y, order_number, line_id, datetime) VALUES (?, ?, ?, ?, ?);"
				_, err = tx.Exec(pointQuery, point.X, point.Y, point.OrderNumber, point.LineId, point.DateTime)
				if err != nil {
					tx.Rollback()
					fmt.Println(err)
				}
			}

			// NOTE: after adding the points that where saved with the length of the line, add the point that we just received to the points.
			line.Points = nil
			line.Color = msg.LineColor
			line.Id = msg.LineId
			line.Thickness = msg.LineThickness

			var point Point
			point.X = msg.X
			point.Y = msg.Y
			point.DateTime = msg.DateTime
			point.OrderNumber = msg.OrderNumber
			point.LineId = msg.LineId
			line.Points = append(line.Points, point) // TODO: Make method in Line for creating point and adding into points.
		} else {
			line.Id = msg.LineId
			line.Color = msg.LineColor
			line.Thickness = msg.LineThickness

			var point Point
			point.X = msg.X
			point.Y = msg.Y
			point.DateTime = msg.DateTime
			point.OrderNumber = msg.OrderNumber
			point.LineId = msg.LineId
			line.Points = append(line.Points, point) // TODO: Make method in Line for creating point and adding into points.
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
