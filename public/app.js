


const canvasElement = document.getElementById("canvas");
const canvasContext = canvasElement.getContext("2d");

let isDrawing = false;
let mouseX;
let mouseY;
let mousePX;
let mousePY;

let UIElement = document.getElementById("UI");

// Setting up stroke weight 
let strokeWeight;
let strokeWeightElement = document.getElementById("StrokeSlider");
strokeSlider.addEventListener("input", (event) => {
    strokeWeight = event.target.value;
});

// Setting up stroke color
let strokeColor;
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
    // colorElements[i].addEventListener('touchstart', () => {
    //     strokeColor = colorElements[i].dataset.color;
    // });
}

document.addEventListener("mousedown", (event) =>{
    if (event.target.isEqualNode(canvasElement)){
        isDrawing = true;
        UIElement.hidden = true;
    }
});

document.addEventListener("mouseup", (event) =>{
    isDrawing = false;
    UIElement.hidden = false;
    mousePX = 0;
    mousePY = 0;
});

document.addEventListener("mousemove", (event) =>{
    if (event.target.isEqualNode(canvasElement) && isDrawing){
        mouseX = event.pageX;
        mouseY = event.pageY;
        if (mousePX || mousePY){
            canvasContext.beginPath();
            canvasContext.moveTo(mousePX, mousePY);
            canvasContext.lineTo(mousePX, mousePY);
            canvasContext.lineTo(mouseX, mouseY);
            canvasContext.strokeStyle = strokeColor;
            canvasContext.lineWidth = strokeWeight;
            canvasContext.lineCap = "round";
            canvasContext.stroke();
            // canvasContext.closePath();
            console.log(`isDrawing at ${mouseX} & ${mouseY}`);
        }

        mousePX = mouseX;
        mousePY = mouseY;
    }
});


