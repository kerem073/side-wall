const socket  = new WebSocket("ws://localhost:3000/point");

socket.addEventListener("open", (event) => {
    // socket.send("Connected");
});

socket.addEventListener("message", (event) => {
    console.log("message from server: " + event.data);
});

const canvasElement = document.getElementById("canvas");
const canvasContext = canvasElement.getContext("2d");

let isDrawing = false;

class Point{
    x = 0;
    y = 0;
    order = 0; // order of the point in the line
    lid = 0; // the id of the line that the point 
    lcolor = 0;
    lthickness = 0;
    date = 0;

    constructor(newx, newy){
        this.x = newx;
        this.y = newy;
    }
}

class Lines{
    currentOrder = 0;
    points = [];
    pPoint = 0;
    lid = 0;
    constructor(){
        this.newLine();
    }

    // addPoint adds a point to the line and draws at the same time
    addPoint(x, y, lcolor, lthickness){
        let point = new Point(x, y);
        point.lid = this.lid;
        point.order = this.currentOrder;
        point.lcolor = lcolor;
        point.lthickness = lthickness;
        this.currentOrder++;

        let date = new Date();
        let formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');
        point.date = formattedDate;

        this.points.push(point);

        if (this.pPoint){
            canvasContext.beginPath();
            canvasContext.moveTo(this.pPoint.x, this.pPoint.y);
            canvasContext.lineTo(this.pPoint.x, this.pPoint.y);
            canvasContext.lineTo(point.x, point.y);
            canvasContext.strokeStyle = point.lcolor;
            canvasContext.lineWidth = point.lthickness;
            canvasContext.lineCap = "round";
            canvasContext.stroke();
            // canvasContext.closePath();
        } else {
            canvasContext.beginPath();
            canvasContext.moveTo(point.x, point.y);
            canvasContext.lineTo(point.x, point.y);
            canvasContext.strokeStyle = strokeColor;
            canvasContext.lineWidth = strokeWeight;
            canvasContext.lineCap = "round";
            canvasContext.stroke();
        }

        this.pPoint = point;
    }

    newLine(){
        this.lid = Math.random().toString(16).slice(2);
        this.pPoint = 0;
        this.currentOrder = 0;
    }

    sendPoints(){
        if (this.points.length > 0){
            for (let i = 0; i < this.points.length; i++){
                // https://www.developer.com/languages/intro-socket-programming-go/
                
                let point = this.points[i];
                let data = {};
                data.x = point.x;
                data.y = point.y;
                data.order = point.order;
                data.lid = point.lid;
                data.lcolor = point.lcolor;
                data.lthickness = point.lthickness;
                data.date = point.date;

                socket.send(JSON.stringify(data))
                this.points.shift()
            }
        }
    }
}


let lines = new Lines();

let UIElement = document.getElementById("UI");

// Setting up stroke weight 
let strokeWeight = 2;
let strokeSlider = document.getElementById("strokeSlider");
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

// TODO: Can't draw where the UIElement is
canvasElement.addEventListener("mousedown", (event) =>{
    isDrawing = true;
    lines.newLine();
});

canvasElement.addEventListener("mouseup", (event) =>{
    isDrawing = false;
});

canvasElement.addEventListener("mousemove", (event) =>{
    if (event.target.isEqualNode(canvasElement) && isDrawing){
        lines.addPoint(event.pageX, event.pageY, strokeColor, strokeWeight);
        lines.sendPoints();
    }
});

// TODO: the very first time clicking and dragging, the UIElement moves up. But after that you can use it as normal.
let UIdrag = false;

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

            let currentLeft = parseFloat(UIElement.style.left + (UIElement.style.width / 2)) || 0;
            let currentTop = parseFloat(UIElement.style.top + (UIElement.style.height / 2)) || 0;

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


