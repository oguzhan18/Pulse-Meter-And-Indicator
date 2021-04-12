class Vector {
  constructor(x,y){
    this.x = x;
    this.y = y;
  }
  static Add(v1, v2){
    return new Vector(v1.x+v2.x,v1.y+v2.y);
  }
  static Sub(v1, v2){
    return new Vector(v1.x-v2.x,v1.y-v2.y);
  }
}

function GetMap(y,x){
  var a = [];
  for (var i = 0; i < y; i++){
    var arr = [];
    for (var j = 0; j < x; j++){
      arr.push(0);
    }
    a.push(arr);
  }
  return a;
}

function mutationFunction(x){
  
    
  if (Math.random() < MUTATION_RATE){
    var newx = x + Math.random() * 0.3 - 0.15;
    return newx;
  }
  return x;
}

class Snake {
  constructor(brain){
    this.grid = GetMap(6,6);
    
    this.tail = [];
    this.tail.push(new Vector(this.grid[0].length/2,this.grid.length/2));
    
    this.apple = new Vector(0,0);
    this.NewApplePos();
    if (brain){
      this.brain = brain.copy();
      this.brain.mutate(mutationFunction);
    } else {
      this.brain = new NeuralNetwork(9, 2, 1);
    }
    
    this.dead = false;
    this.pointsCollected = 0;
    
    return this;
  }
  
  NewApplePos(){
    if (this.grid[0].length * this.grid.length == this.tail.length){
      return;
    }
    var x = (Math.random() * this.grid[0].length) | 0;
    var y = (Math.random() * this.grid.length) | 0;
    
    this.apple = new Vector(x,y);
    
    for (var tail of this.tail){
      if (tail.x == this.apple.x && tail.y == this.apple.y){
        this.NewApplePos();
        break;
      }
    }
  }
  
  Render(){
    var width = canvas.width / this.grid[0].length;
    var height = canvas.height / this.grid.length;
    
    for (var i = 0; i < this.tail.length; i++){
      ctx.fillStyle = i == 0 ? "#000000" : "#777";
      ctx.fillRect(this.tail[i].x * width, this.tail[i].y * height, width, height);
    }
    ctx.fillStyle = "black";
    ctx.fillRect(this.apple.x * width, this.apple.y * height, width, height);
  }
  MoveBody() {
    for (var i = this.tail.length-1; i > 0; i--){
      this.tail[i].x = this.tail[i-1].x;
      this.tail[i].y = this.tail[i-1].y;
    }
  }
  CheckCollisions(){
    var head = this.tail[0];
    if (head.x == this.apple.x && head.y == this.apple.y){
      this.pointsCollected++;
      this.NewApplePos();
      this.tail.push(new Vector(-1,0));
    }
  }
  GetData(){
    var around = [];
    var head = this.tail[0];
    
    for (var y = 0; y < this.grid.length; y++){
      for (var x = 0; x < this.grid[y].length; x++){
        this.grid[y][x] = 0;
      }
    }
    
    var posGrid = this.grid.slice();
    for (var tail of this.tail){
      if (InArrayRange(tail.y, this.grid[0].length) && InArrayRange(tail.x, this.grid.length)){
        posGrid[tail.y | 0][tail.x | 0] = 1;
      }
    }
    
    for (var i = -1; i <= 1; i++){
      for (var j = -1; j <= 1; j++){
        if (i == 0 && j == 0) continue;
        var include = false;
        for (var tail of this.tail){
          var _x = (tail.x + j) | 0;
          var _y = (tail.y + i) | 0;
          
          if (InArrayRange(y,this.grid.length) && InArrayRange(x,this.grid[0].length)){
            if (posGrid[y][x] == 1){
              include = true;
              break;
            }
          }
        }
        around.push(include ? 1 : 0);
      }
    }
    
    around.push(Math.atan2(this.apple.y - head.y, this.apple.x - head.x) / (2 * Math.PI));
    
    return around;
  }
  MoveHead(){
    var head = this.tail[0];
    var angle = (this.brain.feedforward(this.GetData())[0] - 0.5) * 2 * Math.PI;
    
    var moveX = Math.round(Math.cos(angle));
    var moveY = Math.round(Math.sin(angle));
    
    head.x += moveX;
    head.y += moveY;
    
    if (!(InArrayRange(head.y, this.grid[0].length) && InArrayRange(head.x, this.grid.length))){
      this.dead = true;
    }
  }
}

class GeneticAlgorithm {
  static CalculateFitness(){
    var sum = 0;
    
    var bestSnake = 0;
    var bestFit = 0;
    
    for (var snake of snakes){
      var _fit = Math.pow(snake.pointsCollected+1,2);
      sum += _fit;
      snake.fitness = _fit;
      
      if (_fit > bestFit){
        bestSnake = snake;
      }
    }
    for (var snake of snakes){
      snake.fitness /= sum;
    }
    log(`Sinir Veri Atış Durumu: ${bestSnake.pointsCollected}`);
    log(" Nabız Hız: "+sum);
    
    data.push(bestSnake);
    if (data.length > 400){
      data.shift();
    }
    DrawGraph();
  }
  static RandomSelection(){
    var sorted = snakes.slice();
    
    sorted.sort(function(a,b){
      return b.fitness - a.fitness;
    })
    var newPop = [];
    for (var i = 0; i < POPULATION_SIZE; i++){
      var newSnake = new Snake(GeneticAlgorithm.GetRandomSnake(sorted).brain);
      newPop.push(newSnake);
    }
    return newPop;
  }
  static GetRandomSnake(array){
    var rand = Math.random();
    var index = 0;
    while (rand > 0){
      rand -= array[index].fitness;
      
      index++;
    }
    index--;
    return array[index];
  }
}

function log(text,middle){
  if (currentGeneration % LOG_RATE != 0) return;
  if (middle){
    document.getElementById("log").innerHTML += "<span class=text-middle>"+text+"</span><br>";
  } else {
    document.getElementById("log").innerHTML += text+"<br>";
  }
}

function InArrayRange(index, length){
  return index >= 0 && index < length;
}

function DrawGraph(){
  var graph = document.getElementById("graph").getContext("2d");
  
  var width = 400,
      height = 500;
  
  graph.fillStyle = "black";
  graph.fillRect(0,0,width,height);
  
  var x = 0;
  var w = width/data.length;
  
  var highestPoints = 0;
  for (var snake of snakes){
    highestPoints = Math.max(snake.pointsCollected, highestPoints);
  }
  
  for (var dat of data){
    graph.fillStyle = "lime";
    
    var h = dat.pointsCollected / highestPoints * height;
    var y = height - h;
    
    graph.fillRect(x*w,y,w,h);
    x++;
  }
  
  graph.fillStyle = "white";
  graph.textAlign = "left";
  graph.fillText(highestPoints, 0,8);
}

var ctx = document.getElementById("canvas").getContext("2d");
const MUTATION_RATE = 0.1;
const POPULATION_SIZE = 1000;
const SPECTATE_BEST = true;
const LOG_RATE = 25;

var currentGeneration = 0;

var snakes = [];
snakes.push(new Snake());
snakes.push(new Snake());
  
var data = [];

GeneticAlgorithm.CalculateFitness();
GeneticAlgorithm.RandomSelection();

var spectatorIndex = 0;

var fps = 60.0,
    dt = 1/fps;

var mostPoints = 0;
var bestIndex = 0;

function Update(){
  ctx.fillStyle = "white";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  
  var index = 0;
  
  var allDead = true;
  
  if (SPECTATE_BEST){
    spectatorIndex = bestIndex;
  }
  
  for (var snake of snakes){
    if (index == spectatorIndex){
      snake.Render();
    }
    snake.MoveBody();
    snake.MoveHead();
    snake.CheckCollisions();
    index++;
    if (snake.pointsCollected > mostPoints){
      mostPoints = snake.pointsCollected;
      bestIndex = index;
    }
    if (!snake.dead){
      allDead = false;
    }
  }
  
  if (allDead){
    currentGeneration++;
    GeneticAlgorithm.CalculateFitness();
    snakes = GeneticAlgorithm.RandomSelection();
    log("");
    log(`Sinir Hızı Artışın [${currentGeneration}]`,true);
    mostPoints = 0;
    bestIndex = 0;
  }
  
  fps = document.getElementById("fpsInput").value;
  
  setTimeout(Update, 1000/fps);
}
Update();