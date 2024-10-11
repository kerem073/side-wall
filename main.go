package main

// TODO: load test + put it on a vps / laptopserver
// TODO: touch events
// TODO: AUTH?

import (
	"fmt"
	"log"
	"net/http"

	"database/sql"
	"encoding/json"
	_ "github.com/go-sql-driver/mysql"
	"github.com/gorilla/websocket"
)

type Hub struct {
	clients   []Client
	broadcast chan MessageDTO
}

type Client struct {
	conn *websocket.Conn
	hub  *Hub
}

// UTILS
type MessageDTO struct {
	X             int    `json:"x"`
	Y             int    `json:"y"`
	OrderNumber   int    `json:"order_number"`
	LineId        string `json:"line_id"`
	LineColor     string `json:"line_color"`
	LineThickness int    `json:"line_thickness"`
	DateTime      string `json:"datetime"`
	LineEnd       int    `json:"line_end"`
}

// CANVAS
type Point struct {
	X           int    `json:"x"`
	Y           int    `json:"y"`
	OrderNumber int    `json:"order_number"`
	LineId      string `json:"line_id"`
	DateTime    string `json:"datetime"`
	Id          string // mb problamatic
}

type Line struct {
	Id        string `json:"id"`
	Length    int    `json:"length"`
	Color     string `json:"color"`
	Thickness int    `json:"thickness"`
	Points    []Point
}

func (line Line) InsertLine(tx *sql.Tx) error {
	lineQuery := "INSERT INTO lines_details (line_id, line_length, line_color, line_thickness) VALUES (?, ?, ?, ?);"
	_, err := tx.Exec(lineQuery, line.Id, line.Length, line.Color, line.Thickness)
	if err != nil {
		tx.Rollback()
		return err
	}
	return nil
}

func (line Line) InsertPointPool(tx *sql.Tx) error {
	for _, point := range line.Points {
		pointQuery := "INSERT INTO points (x, y, order_number, line_id, datetime) VALUES (?, ?, ?, ?, ?);"
		_, err := tx.Exec(pointQuery, point.X, point.Y, point.OrderNumber, point.LineId, point.DateTime)
		if err != nil {
			tx.Rollback()
			return err
		}
	}
	return nil
}

func (line *Line) AddPoint(msg MessageDTO) {
	var point Point
	point.X = msg.X
	point.Y = msg.Y
	point.DateTime = msg.DateTime
	point.OrderNumber = msg.OrderNumber
	point.LineId = msg.LineId
	line.Points = append(line.Points, point)
}

func (line *Line) NewLine(msg MessageDTO) {
	line.Color = msg.LineColor
	line.Id = msg.LineId
	line.Thickness = msg.LineThickness
	line.Points = nil
}

type Canvas struct {
	Points []Point
	Lines  []Line
}

func (c *Canvas) GetCanvas(db *sql.DB) {

	c.Points = nil
	c.Lines = nil

	PointsQuery := "SELECT * FROM points"
	rows, err := db.Query(PointsQuery)
	if err != nil {
		panic(err)
	}

	for rows.Next() { // INFO: if rows.Next() returns false (so there are no rows left): rows.Close() is automaticlly called
		var point Point
		rows.Scan(&point.Id, &point.X, &point.Y, &point.OrderNumber, &point.LineId, &point.DateTime)
		c.Points = append(c.Points, point)
		// fmt.Printf("added point: ")
		// fmt.Println(point)
	}

	LinesQuery := "SELECT * FROM lines_details"
	rows, err = db.Query(LinesQuery)
	if err != nil {
		panic(err)
	}

	for rows.Next() { // INFO: if rows.Next() returns false (so there are no rows left): rows.Close() is automaticlly called
		var line Line
		rows.Scan(&line.Id, &line.Length, &line.Color, &line.Thickness)
		c.Lines = append(c.Lines, line)
		// fmt.Printf("added line: ")
		// fmt.Println(line)
	}

}

// https://www.alexedwards.net/blog/interfaces-explained

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func main() {

	dsn := "root:lordofthegame666@tcp(127.0.0.1:3306)/sidewall2"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fmt.Println(err)
	}

	err = db.Ping()
	if err != nil {
		fmt.Println(err)
	}
	defer db.Close()

	c := Canvas{}
	hub := Hub{}
	hub.broadcast = make(chan MessageDTO)

	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)

	http.HandleFunc("/point", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println(err)
			return
		}
		defer conn.Close()

		c := Client{}
		c.conn = conn
		c.hub = &hub
		hub.clients = append(hub.clients, c)

		var line Line

		go func() {
			for {
				m := <-hub.broadcast
				err := conn.WriteJSON(m)
				if err != nil {
					fmt.Println(err)
				}
			}
		}()

		// NOTE: Start websockets loop
		for {
			var msg MessageDTO

			err := conn.ReadJSON(&msg)
			if err != nil {
				fmt.Println(err)
				break
			}

			tx, err := db.Begin()
			if err != nil {
				fmt.Println(err)
			}

			// INFO: if the lineend is 1; end of line reached and commit line to database
			// else if the lineid is the same, then insert the point as the line id
			if msg.LineEnd == 1 {
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

			} else if msg.LineId == line.Id {
				line.AddPoint(msg)
			} else {
				line.NewLine(msg)
				line.AddPoint(msg)
			}

			err = tx.Commit()
			if err != nil {
				fmt.Println(err)
			}

			for i := 0; i < len(hub.clients); i++ {
				hub.broadcast <- msg
			}
		}
	})

	http.HandleFunc("/getcanvas", func(w http.ResponseWriter, r *http.Request) {
		c.GetCanvas(db)

		b, err := json.Marshal(c)
		if err != nil {
			panic(err)
		}

		w.Write(b) // TODO: not important rn but remove Points of the Line struct. that is also send.
	})

	log.Print("Listening on :3000")
	err = http.ListenAndServe(":3000", nil)
	if err != nil {
		log.Fatal(err)
	}
}
