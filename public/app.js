const socket  = new WebSocket("ws://localhost:3000/point");

socket.addEventListener("open", (event) => {
    // socket.send("Connected");
});

socket.addEventListener("message", (event) => {
    // console.log("message from server: " + event.data);
});

//  TODO: put everything in modules
//  TODO: get other peoples strokes
//  TODO: get the canvas from the database
//  TODO: implement AUTH + physical qr code? samen met de wsc? >>> if the average differences between points is big in very short amount of time, they will get a warning and then removed.

socket.addEventListener("error", (event) => {
  console.log("WebSocket error: ", event);
});

const canvasElement = document.getElementById("canvas");
const canvasContext = canvasElement.getContext("2d");

let isDrawing = false;
let UIdrag = false;

class MessageDTO{
    x = 0;
    y = 0;
    order_number = 0;
    line_id = 0;
    line_color = 0;
    line_thickness = 0;
    datetime = 0;
}

class Point{
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

class Line{
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
    addPoint(x, y){
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

class CanvasManager {
    points_pool = [];
    curLine = 0;
    
    beginLine(){
        this.curLine = new Line(strokeColor, strokeWeight);
    }

    addPoint(x, y){
        this.curLine.addPoint(x, y);
        let latest_point = this.curLine.latest_point;
        let msg = new MessageDTO();

        msg.x = x;
        msg.y = y;
        msg.order_number = latest_point.order_number;
        msg.line_id = latest_point.line_id;
        msg.line_color = latest_point.line_color;
        msg.line_thickness = latest_point.line_thickness;
        msg.datetime = latest_point.datetime;

        this.points_pool.push(msg);
    }

    sendPoints(){
        for (let i = 0; i < this.points_pool.length; i++){
            console.log("sending: " + JSON.stringify(this.points_pool[i]));
            socket.send(JSON.stringify(this.points_pool[i]));
        }
        this.points_pool = [];
    }

}

let UIElement = document.getElementById("UI");

// Setting up stroke weight 
let strokeSlider = document.getElementById("strokeSlider");
let strokeWeight = parseInt(strokeSlider.value);
strokeSlider.addEventListener("input", (event) => {
    strokeWeight = parseInt(event.target.value);
});

// Setting up stroke color
let strokeColor = "#000";
let colorElements = document.getElementsByClassName('colorElement'); // get the color elements
for (let i = 0; i < colorElements.length; i++) {
    colorElements[i].style.backgroundColor = colorElements[i].dataset.color;

    colorElements[i].addEventListener('click', () => {
        strokeColor = colorElements[i].dataset.color;
        for (let j = 0; j < colorElements.length; j++) {
            colorElements[j].classList.remove('activeColorElement');
        }
        colorElements[i].classList.add('activeColorElement');
    });
}

let canvasManager = new CanvasManager();

// TODO: Can't draw where the UIElement is -> remove and add eventlistener of the UIelement when drawing and stop drawing
canvasElement.addEventListener("mousedown", (event) =>{
    isDrawing = true;
    canvasManager.beginLine();
});

canvasElement.addEventListener("mousemove", (event) =>{
    if (event.target.isEqualNode(canvasElement) && isDrawing){
        canvasManager.addPoint(event.pageX, event.pageY);
        canvasManager.sendPoints();
    }
    if (!UIdrag){
        event.stopPropagation()
    }
});

canvasElement.addEventListener("mouseup", (event) =>{
    isDrawing = false;
});

let mouseOffsetX = 0;
let mouseOffsetY = 0;
let pmousex = 0;
let pmousey = 0;

document.addEventListener("mousedown", (event) => {
    if (!isDrawing && !event.target.isEqualNode(document.getElementById("strokeSlider"))){
        for (let element = event.target; !event.target.isEqualNode(document.body); element = element.parentNode){
            if (element.isEqualNode(UIElement)){
                UIdrag = true;

                mouseOffsetX = parseFloat(UIElement.style.left + (UIElement.style.width / 2)) || 0;
                mouseOffsetY = parseFloat(UIElement.style.top + (UIElement.style.height / 2)) || 0;

                pmousex = 0;
                pmousey = 0;
                break;
            }
        }
    }
});

document.addEventListener("mousemove", (event) => {
    if(UIdrag){
        if (pmousex != 0){
            let offsetx = event.clientX - pmousex;
            let offsety = event.clientY - pmousey;

            let currentLeft = parseFloat(UIElement.style.left + (UIElement.style.width / 2));
            let currentTop = parseFloat(UIElement.style.top + (UIElement.style.height / 2));

            let newX = currentLeft + offsetx;
            let newY = currentTop + offsety;

            UIElement.style.left = newX + "px";
            UIElement.style.top = newY + "px";

            pmousex = event.clientX;
            pmousey = event.clientY;
        } else {
            pmousex = event.clientX;
            pmousey = event.clientY;
        }
    }
});

document.addEventListener("mouseup", (event) => {
    UIdrag = false;
    pmousex = 0;
    pmousey = 0;
});

// TODO: TOUCH EVENTS
// For touch events, the passive boolean needs to be false. This will enable event.preventDefault(). Because it does need to wait if event.Default is called.


