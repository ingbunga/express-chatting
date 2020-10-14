const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const sanitizeHtml = require('sanitize-html');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const { url } = require('inspector');

const app = express();
app.io  = require('socket.io')();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
app.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

usrList = {} // db 변수.

const url2ImgTag = (url) => {
  return  `<img style="max-width: 500px;width: 80%;" src=${url.slice(1, url.length-1)}>`;
}

let colorValed = new RegExp(/#[0-9]|[A-F]|[a-f]{6}/);
let imgUrl = new RegExp(/\[(https?:\/\/.*\.(?:png|jpg))\]/i);

// 아래로는 socket.io 코드

app.io.on('connection', socket => {
  console.log('클라는 살아있다...' + socket.id);
  // 어떤 유저가 들어오면 db 변수에 넣어줌.
  socket.on('handshake', data => {
    data.nickname = sanitizeHtml(data.nickname);
    if(data.nickname.length > 15){
      socket.emit('announce', '닉네임을 15자 이하로 지어주세요.');
      return;
    }
    usrList[socket.id] = {
      'nickname': data.nickname,
      'color': getRandomColor(),
    }
    app.io.emit('announce', data.nickname + '님이 참가하셧습니다.');
    console.log(data.nickname);
  });

  // 메세지를 브로드 캐스트 해줌.
  socket.on('send', data => {
    if(typeof data.sendText !== 'string') return;
    if(!usrInList(socket.id)){
      socket.emit('announce', '서버와의 연결이 이상해진것 같네요. 새로고침을 하세요.');
      return;
    };
    data.sendText = sanitizeHtml(data.sendText);
    data.sendText = data.sendText.replace(imgUrl, url2ImgTag);
    app.io.emit('receive', {
      'id': socket.id, 
      'nickname': usrList[socket.id].nickname,
      'sendText': data.sendText,
      'color':usrList[socket.id].color,
    });
  });

  // 이름을 바꿈.
  socket.on('nameChange', data => {
    if(typeof data !== 'string') return;
    if(!usrInList(socket.id)) return;
    if(data.length > 15){
      socket.emit('announce', '닉네임을 15자 이내로 지어주세요.');
      return;
    }
    data = sanitizeHtml(data);
    app.io.emit('announce', `${usrList[socket.id].nickname}님이 닉네임을 ${data}로 바꾸셧습니다.`);
    usrList[socket.id].nickname = data;
  });

  // 색깔이 바뀜.
  socket.on('colorChange', data => {
    if(typeof data !== 'string') return;
    if(!usrInList(socket.id)) return;
    data = sanitizeHtml(data);
    if(!colorValed.test(data)){
      socket.emit('announce', '올바르지 않은 색깔값을 보내셨어요.');
      return;
    } 
    data = data.toUpperCase();
    app.io.emit('announce', `${usrList[socket.id].nickname}님이 색깔을 ${data}로 바꾸셧습니다.`);
    usrList[socket.id].color = data;
  })

  // 연결이 끊길때.
  socket.on('disconnect', () => {
    if(!usrInList(socket.id)) return;
    if(usrList[socket.id] !== undefined){
      app.io.emit('announce', usrList[socket.id].nickname + '님이 나가셨습니다.');
      delete usrList[socket.id];
    }
  });
});

function usrInList(id){
  let checked = false;
  for(i in usrList) if(i == id) checked = true;
  return checked;
} 

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

module.exports = app;