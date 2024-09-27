class MessageDTO{
    x = 0;
    y = 0;
    order_number = 0;
    line_id = 0;
    line_color = 0;
    line_thickness = 0;
    datetime = 0;
}

export class Point{
    x = 0;
    y = 0;
    order_number = 0; // order of the point in the line
    line_id = 0; // the id of the line that the point
    datetime = 0;

    constructor(newx, newy, lid, order){
        this.x = newx;
        this.y = newy;
        this.order_number = order;
        this.line_id = lid;

        let datetime = new Date();
        let formattedDate = datetime.toISOString().slice(0, 19).replace('T', ' ');
        this.datetime = formattedDate;
    }
}

export class Line{
    line_id = 0;
    current_length = 0;
    line_color = 0;
    line_thickness = 0;
    latest_point = 0;
    points = [];

    constructor(color, weight){
        this.newLine();
        this.line_color = color;
        this.line_thickness = weight;
    }

    // addPoint adds a point to the line and draws at the same time
    addPoint(x, y, canvasContext){
        let point = new Point(x, y, this.line_id, this.current_length);

        this.points.push(point);

        canvasContext.beginPath();
        if (this.current_length == 0){
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

        this.latest_point = point;
        this.current_length++;
    }

    newLine(){
        this.line_id = Math.random().toString(16).slice(2);
        this.current_length = 0;
        this.points = [];
    }
}

export class CanvasManager {
    points_pool = [];
    curLine = 0;
    
    beginLine(color, thickness){
        this.curLine = new Line(color, thickness);
    }

    addPoint(x, y, canvasContext){
        this.curLine.addPoint(x, y, canvasContext);
        let latest_point = this.curLine.latest_point;
        let msg = new MessageDTO();

        msg.x = x;
        msg.y = y;
        msg.order_number = latest_point.order_number;
        msg.line_id = latest_point.line_id;
        msg.datetime = latest_point.datetime;
        msg.line_color = this.curLine.line_color;
        msg.line_thickness = this.curLine.line_thickness;

        this.points_pool.push(msg);
    }

    sendPoints(socket){
        for (let i = 0; i < this.points_pool.length; i++){
            console.log("sending: " + JSON.stringify(this.points_pool[i]));
            socket.send(JSON.stringify(this.points_pool[i]));
        }
        this.points_pool = [];
    }

}
