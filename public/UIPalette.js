export class UIPalette{

    mouseOffsetX = 0;
    mouseOffsetY = 0;
    pmousex = 0;
    pmousey = 0;
    UIdrag = 0;

    UIPaletteElement = 0;

    constructor(element){
        this.UIPaletteElement = element;
    }

    eventStart(){
        this.UIdrag = true;

        this.mouseOffsetX = parseFloat(this.UIPaletteElement.style.left + (this.UIPaletteElement.style.width / 2)) || 0;
        this.mouseOffsetY = parseFloat(this.UIPaletteElement.style.top + (this.UIPaletteElement.style.height / 2)) || 0;

        this.pmousex = 0;
        this.pmousey = 0;
    }

    eventMove(clientx, clienty){
        if(this.UIdrag){
            if (this.pmousex != 0){
                let offsetx = clientx - this.pmousex;
                let offsety = clienty - this.pmousey;

                let currentLeft = parseFloat(this.UIPaletteElement.style.left + (this.UIPaletteElement.style.width / 2));
                let currentTop = parseFloat(this.UIPaletteElement.style.top + (this.UIPaletteElement.style.height / 2));

                let newX = currentLeft + offsetx;
                let newY = currentTop + offsety;

                this.UIPaletteElement.style.left = newX + "px";
                this.UIPaletteElement.style.top = newY + "px";

                this.pmousex = clientx;
                this.pmousey = clienty;
            } else {
                this.pmousex = clientx;
                this.pmousey = clienty;
            }
        }
    }

    eventEnd(){
        this.UIdrag = false;
        this.pmousex = 0;
        this.pmousey = 0;
    }
}
