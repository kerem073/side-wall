package main

// TODO: optimization if it is needed. kijk naar de tools hier: https://www.youtube.com/watch?v=M0HER1G5BRw
// https://dev.to/agamm/how-to-profile-go-with-pprof-in-30-seconds-592a
// https://github.com/google/pprof?tab=readme-ov-file
// This is good i think: https://jvns.ca/blog/2017/09/24/profiling-go-with-pprof/
// https://www.datacamp.com/tutorial/set-up-and-configure-mysql-in-docker
// https://developer.mozilla.org/en-US/docs/Web/API/Performance_API
// TODO: go testing / asserts
// TODO: AUTH and cookies

// ISSUE: When we refresh and start drawing, the server keeps sending websocket:close send on every point received i believe. after making a create tables if not exists db exec

// NOTE: i should write code / api in such a way that someone else could use it easy and efficeiently

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	_ "net/http/pprof"
	"os"

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

func check(e error) {
	if e != nil {
		panic(e)
	}
}

func main() {

	// db_name := os.Getenv("DB_NAME")
	// db_pass := os.Getenv("DB_PASS")

	// dsn := "root:" + db_pass + "@tcp(127.0.0.1:3306)/" + db_name // The database sidewall3 need to be made
	dsn := "root:lordofthegame666@tcp(database:3306)/sidewall" // The database sidewall3 need to be made
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fmt.Println(err)
		os.Exit(1) // TODO: docker doesnt use the most recent file dafuq
	}

	err = db.Ping()
	if err != nil {
		fmt.Println(err)
		os.Exit(1) // TODO: docker doesnt use the most recent file dafuq
	}
	defer db.Close()

	// OPTIM: should i completely setup the whole database from scratch? how does docker do that when a container gets run?

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS lines_details(
		line_id VARCHAR(14) NOT NULL,
		line_length INT,
		line_color VARCHAR(7),
		line_thickness INT,
		PRIMARY KEY(line_id)
	);`)
	if err != nil {
		os.Exit(1) // TODO: docker doesnt use the most recent file dafuq
		fmt.Println(err)
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS points(
		point_id INT AUTO_INCREMENT PRIMARY KEY,
		x INT,
		y INT,
		order_number INT,
		line_id VARCHAR(14),
		datetime DATETIME,
		FOREIGN KEY(line_id) REFERENCES lines_details(line_id)
	)`)
	if err != nil {
		os.Exit(1) // TODO: docker doesnt use the most recent file dafuq
		fmt.Println(err)
	}

	c := Canvas{}
	hub := Hub{}
	hub.broadcast = make(chan MessageDTO)

	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)

	http.HandleFunc("/point", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			os.Exit(1) // TODO: docker doesnt use the most recent file dafuq
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
