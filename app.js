const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const sanitizeHtml = require('sanitize-html');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const app = express();
app.io  = require('socket.io')();
const crypto = require('crypto');

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

// 아래로는 socket.io 코드

app.io.on('connection', socket => {
  console.log('클라는 살아있다...' + socket.id);

  // 어떤 유저가 들어오면 db 변수에 넣어줌.
  socket.on('handshake', data => {
    data.nickname = sanitizeHtml(data.nickname);
    usrList[socket.id] = {
      'nickname': data.nickname
    }
    app.io.emit('announce', data.nickname + '님이 참가하셧습니다.');
    app.io.emit('userList', usrList);
    console.log(data.nickname);
  });

  // 메세지를 브로드 캐스트 해줌.
  socket.on('send', data => {
    data.sendText = sanitizeHtml(data.sendText);
    app.io.emit('receive', {'id': socket.id, 'nickname': usrList[socket.id].nickname,'sendText': data.sendText});
  });

  // 이름을 바꿈.
  socket.on('nameChange', data => {
    data = sanitizeHtml(data);
    app.io.emit('announce', `${usrList[socket.id].nickname}님이 닉네임을 ${data}로 바꾸셧습니다.`);
    usrList[socket.id].nickname = data;
  });

  // 연결이 끊길때.
  socket.on('disconnect', () => {
    if(usrList[socket.id] !== undefined){
      app.io.emit('announce', usrList[socket.id].nickname + '님이 나가셨습니다.');
      app.io.emit('userList', usrList);
      delete usrList[socket.id];
    }
  });
});

module.exports = app;