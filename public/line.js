export class Line {
    line_id = 0;
    current_length = 0;
    line_color = 0;
    line_thickness = 0;
    latest_point = 0;
    points = [];

    constructor(color, weight) {
        this.newLine();
        this.line_color = color;
        this.line_thickness = weight;
    }

    // addPoint adds a point to the line and draws at the same time
    addPoint(x, y, canvasContext) {
        let point = new Point(x, y, this.line_id, this.current_length);

        this.points.push(point);

        this.drawPoint(point, canvasContext);

    }

    drawPoint(point, canvasContext) {
        canvasContext.beginPath();
        if (this.current_length == 0) {
            canvasContext.strokeStyle = this.line_color;
            canvasContext.lineWidth = this.line_thickness;
            canvasContext.lineCap = "round";
            canvasContext.moveTo(point.x, point.y);
            canvasContext.lineTo(point.x, point.y);
            canvasContext.stroke();
        } else {
            canvasContext.strokeStyle = this.line_color;
            canvasContext.lineWidth = this.line_thickness;
            canvasContext.lineCap = "round";
            canvasContext.moveTo(this.latest_point.x, this.latest_point.y);
            canvasContext.lineTo(this.latest_point.x, this.latest_point.y);
            canvasContext.lineTo(point.x, point.y);
            canvasContext.stroke();
        }

        this.current_length++;
        this.latest_point = point;
    }

    newLine() {
        this.line_id = Math.random().toString(16).slice(2);
        this.current_length = 0;
        this.points = [];
    }
}
