package canvas

import (
	"database/sql"
	"side_wall/utils"
)

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

func (line *Line) AddPoint(msg utils.MessageDTO) {
	var point Point
	point.X = msg.X
	point.Y = msg.Y
	point.DateTime = msg.DateTime
	point.OrderNumber = msg.OrderNumber
	point.LineId = msg.LineId
	line.Points = append(line.Points, point) // TODO: Make method in Line for creating point and adding into points.
}

func (line *Line) NewLine(msg utils.MessageDTO) {
	line.Color = msg.LineColor
	line.Id = msg.LineId
	line.Thickness = msg.LineThickness
	line.Points = nil
}
