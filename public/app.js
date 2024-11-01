import { Point, Line, CanvasManager } from './canvas.js'
import { UIPalette } from './UIPalette.js';

let socket = new WebSocket("ws://localhost:3000/point");

socket.addEventListener("open", (event) => {
    // socket.send("Connected");
});

let lines = [];
let notInDrawingLines = false;
socket.addEventListener("message", (event) => {
    let point = JSON.parse(event.data);

    if (lines.length == 0){
        let l = new Line(point.line_color, point.line_thickness);
        l.line_id = point.line_id;
        lines.push(l);
    }

    for (let i = 0; i < lines.length; i++){
        if (point.line_id == lines[i].line_id){
            lines[i].drawPoint(point, canvasContext);
            break;
        }
        if ((lines.length - 1) == i){
            notInDrawingLines = true;
        }
    }
    
    if (notInDrawingLines){
        let l = new Line(point.line_color, point.line_thickness);
        l.line_id = point.line_id;
        lines.push(l);
    }

    if (point.line_end == 1){
        let indexToRemove;
        for (let i = 0; i < lines.length; i++){
            if (point.line_id == lines[i].line_id){
                indexToRemove = i;
                break;
            }
        }
        lines.splice(indexToRemove, 1);
    }
});

socket.addEventListener("error", (event) => {
  console.log("WebSocket error: ", event);
});

//  TODO: implement AUTH + physical qr code? samen met de wsc? >>> if the average differences between points is big in very short amount of time, they will get a warning and then removed.

const canvasElement = document.getElementById("canvas");
const canvasContext = canvasElement.getContext("2d");

let isDrawing = false;

let UIPaletteElement = document.getElementById("UI");

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
const uiPalette = new UIPalette(UIPaletteElement);

// TODO: Can't draw where the UIPaletteElement is -> remove and add eventlistener of the UIelement when drawing and stop drawing
canvasElement.addEventListener("mousedown", (event) =>{
    isDrawing = true;
    canvasManager.beginLine(strokeColor, strokeWeight);
});

canvasElement.addEventListener("mousemove", (event) =>{
    console.log("mouseevent");
    if (event.target.isEqualNode(canvasElement) && isDrawing){
        canvasManager.addPoint(event.pageX, event.pageY, canvasContext, false);
        canvasManager.sendPoints(socket); // FIX: The first point is drawn but not send. there are also other issues but i dont care
    }
    if (!uiPalette.UIdrag){
        event.stopPropagation()
    }
});

canvasElement.addEventListener("mouseup", (event) =>{
    isDrawing = false;
    canvasManager.addPoint(event.pageX, event.pageY, canvasContext, true); // OPTIM: Is the mouseup pagex and pagey different than the last mousemove pagex and y?
    canvasManager.sendPoints(socket);
    console.log(event);
});


document.addEventListener("mousedown", (event) => {
    if (!isDrawing && !event.target.isEqualNode(document.getElementById("strokeSlider"))){
        for (let element = event.target; !element.isEqualNode(document.body); element = element.parentNode){
            if (element.isEqualNode(UIPaletteElement)){
                uiPalette.eventStart();
                break;
            }
        }
    }
});

document.addEventListener("mousemove", (event) => {
    uiPalette.eventMove(event.clientX, event.clientY);
});

document.addEventListener("mouseup", (event) => {
    uiPalette.eventEnd();
});

async function getCanvasAndDraw(){
    const url = "/getcanvas";
    const response = await fetch(url);
    const data = await response.json();

    let drawingLines = [];
    let notInDrawingLines = false;
    for (let i = 0; i < await data.Points.length; i++){
        let point = await data.Points[i];

        if (drawingLines.length == 0){
            for (let j = 0; j < await data.Lines.length; j++){
                let data_line = data.Lines[j];
                if (point.line_id == data_line.id){
                    let line = new Line(data_line.color, data_line.thickness);
                    line.id = data_line.id;
                    drawingLines.push(line);
                }
            }
        }

        for (let j = 0; j < drawingLines.length; j++){
            let drawingLine = drawingLines[j];

            if (point.line_id == drawingLine.id){
                drawingLine.drawPoint(point, canvasContext);
                break;
            }

            if (j == drawingLines.length - 1){
                notInDrawingLines = true;
            }
        }

        if (notInDrawingLines){
            for (let j = 0; j < await data.Lines.length; j++){
                let data_line = data.Lines[j];
                if (point.line_id == data_line.id){
                    let line = new Line(data_line.color, data_line.thickness);
                    line.id = data_line.id;
                    drawingLines.push(line);
                }
            }
            notInDrawingLines = false;
        }
    }
}

getCanvasAndDraw();

// TODO: TOUCH EVENTS
// For touch events, the passive boolean needs to be false. This will enable event.preventDefault(). Because it does need to wait if event.Default is called.
let scrolling = false;
// canvasElement.addEventListener("touchstart", (event) =>{
//     event.preventDefault();
//     if (event.touches.length == 1){
//         isDrawing = true;
//         canvasManager.beginLine(strokeColor, strokeWeight);
//         canvasManager.addPoint(event.touches[0].pageX, event.touches[0].pageY, canvasContext, false);
//         canvasManager.sendPoints(socket); // FIX: The first point is drawn but not send. there are also other issues but i dont care
//     } else if (event.touches.length == 2){
//         scrolling = true;
//     }
// }, {passive: false});

let ptouchx = 0;
let ptouchy = 0;
let scrollx = 0;
let scrolly = 0;

// canvasElement.addEventListener("touchmove", (event) =>{
//     event.preventDefault();
//     if (event.target.isEqualNode(canvasElement) && isDrawing){
//         canvasManager.addPoint(event.touches[0].pageX, event.touches[0].pageY, canvasContext, false);
//         canvasManager.sendPoints(socket); // FIX: The first point is drawn but not send. there are also other issues but i dont care
//     }
//     if (!uiPalette.UIdrag){
//         event.stopPropagation()
//     }
//     if (scrolling || event.touches.length == 2){
//         if (ptouchx != 0){
//             scrollx = ptouchx - touches[0].pageX;
//             scrolly = ptouchy - touches[0].pagey;
//             canvasElement.scrollBy(scrollx, scrolly);
//         } else {
//             ptouchx = event.touches[0].pageX;
//             ptouchy = event.touches[0].pageY;
//         }
//     }
// }, {passive: false});
//
//
// canvasElement.addEventListener("touchend", (event) =>{
//     event.preventDefault();
//     isDrawing = false;
//     canvasManager.addPoint(event.changedTouches[0].pageX, event.changedTouches[0].pageY, canvasContext, true);
//     canvasManager.sendPoints(socket);
//     console.log(event);
// }, {passive: false});


// OPTIM: When we touch the slider and then move, it get prevented by the event.preventDefault. Check what we touched at the begining so we can preventDefault more selective
document.addEventListener("touchstart", (event) => {
    if (!isDrawing && !event.target.isEqualNode(document.getElementById("strokeSlider"))){
        for (let element = event.target; !element.isEqualNode(document.body); element = element.parentNode){
            if (element.isEqualNode(UIPaletteElement)){
                uiPalette.eventStart();
                break;
            }
        }
    }
}, {passive: false});

document.addEventListener("touchmove", (event) => {
    event.preventDefault();
    uiPalette.eventMove(event.touches[0].clientX, event.touches[0].clientY);
}, {passive: false});

document.addEventListener("touchend", (event) => {
    // event.preventDefault();
    uiPalette.eventEnd();
}, {passive: false});


document.addEventListener("touchstart", (event) => {
    event.preventDefault();
    console.log(event.touches[0]);
    if (event.touches.length == 2){
        for (let i = 0; i < event.touches.length; i++){
            ptouchx += event.touches[i].clientX;
            ptouchy += event.touches[i].clientY;
        }
        ptouchx = Math.round(ptouchx / event.touches.length);
        ptouchy = Math.round(ptouchy / event.touches.length);
        console.log(`ptouchx: ${ptouchx} | ptouchy: ${ptouchy}`);
    }
}, {passive: false});

let touchx = 0;
let touchy = 0;
let lastScrollTime = 0;
let scrollSpeedFactor = 0.5;
// TODO: set timeout or throttle or something like that. it is still a bit ass
document.addEventListener("touchmove", (event) => {
    event.preventDefault();
    console.log("===============");

    if (event.touches.length == 2){
        for (let i = 0; i < event.touches.length; i++){
            touchx += event.touches[i].clientX;
            touchy += event.touches[i].clientY;
            console.log(`[${i}]: clientx: ${event.touches[i].clientX} | clientY: ${event.touches[i].clientY}`);
        }
        console.log(`ptouchx: ${ptouchx} | ptouchy: ${ptouchy}`);

        touchx = Math.round(touchx / event.touches.length);
        touchy = Math.round(touchy / event.touches.length);
        console.log(`touchx: ${touchx} | touchy: ${touchy}`);

        scrollx = ptouchx - touchx;
        scrolly = ptouchy - touchy;
        console.log(`scrollx: ${scrollx} | scrolly: ${scrolly}`);
        console.log(`BEFORE window.scrollX: ${window.scrollX} | scrolly: ${scrolly}`);

        const currentTime = Date.now();
        if (currentTime - lastScrollTime > 16) { // ~60fps
            window.scrollBy(scrollx, scrolly);
            lastScrollTime = currentTime;
        }

        console.log(`AFTER window.scrollX: ${window.scrollX} | scrolly: ${scrolly}`);
    }

    ptouchx = touchx;
    ptouchy = touchy;

    touchx = 0;
    touchy = 0;

}, {passive: false});

document.addEventListener("touchend", (event) => {
    event.preventDefault();
    ptouchx = 0;
    ptouchy = 0;
}, {passive: false});



// Checking if we are using the mobile version. Thanks to http://detectmobilebrowsers.com/ and https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser | Michael Zaporozhets
window.mobileAndTabletCheck = function () {
    let check = false;
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
};
