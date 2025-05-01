require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
mongoose.connect('mongodb+srv://yara01:CHmc7pWgoaYOhpPx@cluster0.hgsirvn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
                , { useNewUrlParser: true, useUnifiedTopology: true })
// Basic Configuration
const port = process.env.PORT || 3000;


app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.use(bodyParser.urlencoded({ extended: true }))

//database and schema set up
const urlSchema = new mongoose.Schema({
  original:String,
  short:Number
})

var Url = mongoose.model('Url',urlSchema)
var createAndSaveUrl =function(original,short,done){
  let genUrl = new Url({original:original, short:short})
  genUrl.save(function(err, data) {
    if (err) return console.error(err);
    done(null, data)
  });
}
var findByOriginal = function(original, done){
  Url.find({original: original}, function (err, personFound) {
    if (err) return console.log(err);
    done(null, personFound);
  });
}

function genUrl(url){
  let min = 1
  let max = 100
  let num = Math.floor((Math.random() * max) + min);
  if(url=='freeCodeCamp.org'){
  num = 1
  }
  
  
  return num;
}

function check(url, cb){
  findByOriginal(url, function(err, data) {
    if (err) {
      console.error(err);
      return cb(null); // or handle error differently
    }

    if (data && data.length == 1) {
      cb(data); // URL exists
    } else {
      cb(null); // URL does not exist
    }
  });
}

app.post("/api/shorturl",function(req,res){
  let originalUrl = req.body.url
  if (originalUrl === null || originalUrl === '') { 
    return res.json({ error: 'invalid url' }); 
  }
  let domain = originalUrl.match(/^https?:?\/\//)
  originalUrl=originalUrl.replace(/^https?:?\/\//, "");
  console.log('param: '+originalUrl)
  dns.lookup(originalUrl, function(err,valid){
    if(err) return res.json({ error: 'invalid url' }); 
    if(valid){
      Url.find({original:originalUrl}).exec(function(err,url){
    if(err) return res.json({ error: 'invalid url' }); 
    if(url.length==1){
      console.log('ok')
      return res.json({original_url:domain+url[0].original, short_url:url[0].short})
    }else{
      console.log('dont')
      createAndSaveUrl(originalUrl,genUrl(), function(err,obj){
        //console.log(obj)
        return res.json({original_url:domain+obj.original, short_url:obj.short})
      })
    }
  })
    }else{
      return res.json({error:'invalid url'})
    }
  })
})

app.get("/api/shorturl/:id",function(req,res){
  let url = req.params.id;
  Url.find({short:url}).exec(function(err,url){
    if(err) console.error(err)
    if(url) res.redirect('https://'+url[0].original+'/')
  })
})
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
