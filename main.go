package main

import (
	"fmt"
	"log"
	"net/http"

	"database/sql"
	"encoding/json"
	_ "github.com/go-sql-driver/mysql"
	"github.com/gorilla/websocket"
)

// UTILS
type MessageDTO struct {
	X             int    `json:"x"`
	Y             int    `json:"y"`
	OrderNumber   int    `json:"order_number"`
	LineId        string `json:"line_id"`
	LineColor     string `json:"line_color"`
	LineThickness int    `json:"line_thickness"`
	DateTime      string `json:"datetime"`
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
	rows, err := db.Query(PointsQuery) // TODO: de pointer is nil. hij kan het ook niet later references omdat het nil is. de pointer is er niet
	if err != nil {
		panic(err)
	}

	for rows.Next() { // if rows.Next() returns false (so there are no rows left): rows.Close() is automaticlly called
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

	for rows.Next() { // if rows.Next() returns false (so there are no rows left): rows.Close() is automaticlly called
		var line Line
		rows.Scan(&line.Id, &line.Length, &line.Color, &line.Thickness)
		c.Lines = append(c.Lines, line)
		// fmt.Printf("added line: ")
		// fmt.Println(line)
	}

}

// https://www.alexedwards.net/blog/interfaces-explained
// TODO: de-abstract everything. Alles moet in een file zitten. veel te vroeg ge abstraheerd. lekker veel global variables

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

	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)

	http.HandleFunc("/point", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println(err)
			return
		}
		defer conn.Close()

		var line Line
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

				// TODO: there should be a commit command comming from the client so the server know directly when to commit and not wait for a new line id
			} else { // NOTE: if the ids dont match and there are no points, it is the first line, so create a new line and add the point
				line.NewLine(msg)
				line.AddPoint(msg)
			}

			err = tx.Commit()
			if err != nil {
				fmt.Println(err)
			}

			// TODO: Send points to other clients
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
	if db != nil {
		err = http.ListenAndServe(":3000", nil)
		if err != nil {
			log.Fatal(err)
		}
	}
}
