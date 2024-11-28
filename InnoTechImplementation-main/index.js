document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);

    class Notification {
        constructor() {
            this.message = '';
            this.displayUntil = 0;
            this.isActive = false;
        }

        show(message, duration = 2000) {
            this.message = message;
            this.displayUntil = Date.now() + duration;
            this.isActive = true;
        }

        draw(ctx) {
            if (Date.now() < this.displayUntil) {
                ctx.font = '20px Arial';
                const textMetrics = ctx.measureText(this.message);
                const textWidth = textMetrics.width;
                const boxPadding = 20;
                const boxWidth = textWidth + boxPadding * 2;
                const boxHeight = 60;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(
                    canvas.width / 2 - boxWidth / 2,
                    canvas.height / 2 - boxHeight / 2,
                    boxWidth, 
                    boxHeight
                );

                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.fillText(
                    this.message, 
                    canvas.width / 2,
                    canvas.height / 2 + 10
                );
            } else {
                this.isActive = false;
            }
        }
    }

    class ImageObject {
        constructor(src, x, y, category, game) {
            this.img = new Image();
            this.img.src = src;
            this.x = x;
            this.y = y;
            this.speedOfFalling = 0.5; //Luke did this
            this.category = category;
            this.isDragging = false;
            this.width = 50;
            this.height = 50;
            this.game = game;
            this.img.onload = () => this.draw(ctx);
        }

        draw(ctx) {
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        }

        update(notificationActive) {
            if (!this.isDragging && !notificationActive) {
                this.y += this.speedOfFalling;
            }
        }

        isMouseOver(mouseX, mouseY) {
            return mouseX > this.x && mouseX < this.x + this.width &&
                   mouseY > this.y && mouseY < this.y + this.height;
        }

        breakApart() {
            if (this.category === 'fullVape') {
                const components = [
                    { src: 'images/battery.png', category: 'battery' },
                    { src: 'images/vapecontainer.png', category: 'recyclable' },
                    { src: 'images/vapeliquid.png', category: 'liquid' },
                ];

                components.forEach(component => {
                    const newX = this.x + Math.random() * 100 - 50;
                    const newY = this.y + Math.random() * 50 - 25;
                    this.game.addImageObject(new ImageObject(component.src, newX, newY, component.category, this.game));
                });
            }
        }
    }

    class Bin {
        constructor(src, x, category, width) {
            this.img = new Image();
            this.img.src = src;
            this.x = x;
            this.category = category;
            this.width = width;
            this.height = 130;
            this.y = 0;
            this.img.onload = () => this.draw(ctx);
        }

        setBottomPosition(canvasHeight) {
            this.y = canvasHeight - this.height;
        }

        draw(ctx) {
            ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        }
    }

    class Game {
        constructor(canvas, ctx) {
            this.canvas = canvas;
            this.ctx = ctx;
            this.imageObjects = [];
            this.bins = [
                new Bin('images/generalbin.png', 0, 'organic', canvas.width / 4),
                new Bin('images/batterybin.png', canvas.width / 4, 'battery', canvas.width / 4),
                new Bin('images/recyclablebin.png', canvas.width / 2, 'recyclable', canvas.width / 4),
                new Bin('images/vapebin.png', 3 * canvas.width / 4, 'liquid', canvas.width / 4),
            ];
            this.mouseX = 0;
            this.mouseY = 0;
            this.draggedObject = null;
            this.score = 0;
            this.streak = 0;
            this.multiplier = 1;
            this.level = 1;
            this.rightSound = new Audio('sounds/right.mp3');
            this.wrongSound = new Audio('sounds/wrong.mp3');

            this.notification = new Notification();

            this.initImageObjects();
            this.init();
            this.updateBinPositions();
        }

        initImageObjects() {
            const items = [
                { src: 'images/apple.png', category: 'organic' },
                { src: 'images/orange.png', category: 'organic' },
                { src: 'images/battery.png', category: 'battery' },
                { src: 'images/batteryb.png', category: 'battery' },
                { src: 'images/vapecontainer.png', category: 'recyclable' },
                { src: 'images/vapecontainerb.png', category: 'recyclable' },
                { src: 'images/vapeliquid.png', category: 'liquid' },
                { src: 'images/vapeliquidb.png', category: 'liquid' },
                { src: 'images/fullvape.png', category: 'fullVape' },
            ];

            items.forEach(item => {
                const x = Math.random() * (canvas.width - 100) + 50;
                const y = Math.random() * 50;
                this.imageObjects.push(new ImageObject(item.src, x, y, item.category, this));
            });
        }

        addImageObject(imageObject) {
            this.imageObjects.push(imageObject);
        }

        updateBinPositions() {
            const canvasHeight = this.canvas.height;
            this.bins.forEach(bin => bin.setBottomPosition(canvasHeight));
        }

        init() {
            this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
            this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
            this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
            window.addEventListener('resize', () => {
                resizeCanvas();
                this.updateBinPositions();
            });
            this.gameLoop();
        }

        onMouseDown(e) {
            this.mouseX = e.offsetX;
            this.mouseY = e.offsetY;
            for (let i = this.imageObjects.length - 1; i >= 0; i--) {
                if (this.imageObjects[i].isMouseOver(this.mouseX, this.mouseY)) {
                    this.draggedObject = this.imageObjects[i];
                    this.draggedObject.isDragging = true;

                    if (this.draggedObject.category === 'fullVape') {
                        this.draggedObject.breakApart();
                        this.imageObjects.splice(i, 1);
                    }

                    break;
                }
            }
        }

        onMouseMove(e) {
            if (this.draggedObject) {
                this.mouseX = e.offsetX;
                this.mouseY = e.offsetY;
                this.draggedObject.x = this.mouseX - this.draggedObject.width / 2;
                this.draggedObject.y = this.mouseY - this.draggedObject.height / 2;
            }
        }

        onMouseUp() {
            if (this.draggedObject) {
                this.draggedObject.isDragging = false;
                this.checkDisposal(this.draggedObject);
                this.draggedObject = null;
            }
        }

        checkDisposal(imageObject) {
            const binWidth = this.canvas.width / this.bins.length;
            const binIndex = Math.floor(imageObject.x / binWidth);

            if (binIndex >= 0 && binIndex < this.bins.length) {
                const bin = this.bins[binIndex];
                const isWithinYBounds = imageObject.y + imageObject.height >= bin.y;

                if (isWithinYBounds) {
                    if (imageObject.category === bin.category) {
                        this.notification.show(`Correctly disposed of ${imageObject.category}!`);
                        this.rightSound.play();
                        this.score += 10 * this.multiplier;
                        this.streak++
                        this.scoreMultiplier()
                    } else {
                        this.notification.show(`${imageObject.category} should not be disposed in the ${bin.category} bin.`);
                        this.wrongSound.play();
                        this.score -= 5;
                        this.streak = 0;
                        this.multiplier = 1;
                    }
                }
            } else {
                this.notification.show(`Item missed the bins. Try again.`);
            }
        }

        gameLoop() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.imageObjects.forEach(imageObject => {
                imageObject.update(this.notification.isActive);
                imageObject.draw(this.ctx);
            });

            this.bins.forEach(bin => bin.draw(this.ctx));

            this.notification.draw(this.ctx);
            this.displayScore()
            this.increasedSpeed()
            this.increasedItems()

            requestAnimationFrame(this.gameLoop.bind(this));
        }

        //Sound Effects = Luke

        //Luke
        displayScore(){
            const scoreMessage = `Score: ${this.score} : Multiplier X${this.multiplier}`;
            this.ctx.font = '30px Times New Roman';
            this.ctx.fillStyle = 'Black';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(scoreMessage, this.canvas.width / 2, 50);
        }

        //Luke
        scoreMultiplier(){
            if (this.streak >= 1){
                this.multiplier = 2;
            } else {
                this.multiplier = 1;
            }
        }

        //Luke
        increasedSpeed(){
            if (this.level === 2){
                this.imageObjects.forEach(imageObject => {
                        imageObject.speedOfFalling = 1;
                })
            }
        }

        //Luke
        increasedItems() {
            if (this.level === 2 && !this.itemsIncreased) {
                const items = [
                    {src: 'images/apple.png', category: 'organic'},
                    {src: 'images/orange.png', category: 'organic'},
                    {src: 'images/battery.png', category: 'battery'},
                    {src: 'images/batteryb.png', category: 'battery'},
                    {src: 'images/vapecontainer.png', category: 'recyclable'},
                    {src: 'images/vapecontainerb.png', category: 'recyclable'},
                    {src: 'images/vapeliquid.png', category: 'liquid'},
                    {src: 'images/vapeliquidb.png', category: 'liquid'},
                    {src: 'images/fullvape.png', category: 'fullVape'},
                    {src: 'images/apple.png', category: 'organic'},
                ];

                for (let i = 0; i < 10; i++) {
                    const randomItem = items[Math.floor(Math.random() * items.length)];
                    const x = Math.random() * (canvas.width - 100) + 50;
                    const y = Math.random() * 50;

                    this.imageObjects.push(new ImageObject(randomItem.src, x, y, randomItem.category, this));
                }
                this.itemsIncreased = true;
            }
        }

        //Luke & Michael
        swappingBins(){
            if (this.level == 2){

            }
        }

        //Luke & Michael
        leaderboard(){

        }
    }

    const game = new Game(canvas, ctx);
});
