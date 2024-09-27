package utils

type MessageDTO struct {
	X             int    `json:"x"`
	Y             int    `json:"y"`
	OrderNumber   int    `json:"order_number"`
	LineId        string `json:"line_id"`
	LineColor     string `json:"line_color"`
	LineThickness int    `json:"line_thickness"`
	DateTime      string `json:"datetime"`
}
