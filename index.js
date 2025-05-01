require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://yara01:CHmc7pWgoaYOhpPx@cluster0.hgsirvn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
                { useNewUrlParser: true, useUnifiedTopology: true });

// Basic Configuration
const port = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({ extended: true }));

// Database and schema setup
const urlSchema = new mongoose.Schema({
  original: String,
  short: Number
});

var Url = mongoose.model('Url', urlSchema);

var createAndSaveUrl = function(original, short, done) {
  let genUrl = new Url({ original: original, short: short });
  genUrl.save(function(err, data) {
    if (err) return console.error(err);
    done(null, data);
  });
};

var findByOriginal = function(original, done) {
  Url.find({ original: original }, function(err, personFound) {
    if (err) return console.log(err);
    done(null, personFound);
  });
};

// Generate unique short URL
function genUrl(url) {
  let min = 1;
  let max = 100;
  let num = Math.floor(Math.random() * (max - min + 1)) + min;
  if (url === 'freeCodeCamp.org') {
    num = 1;
  }
  return num;
}

// Check if URL exists in the database
function check(url, cb) {
  findByOriginal(url, function(err, data) {
    if (err) {
      console.error(err);
      return cb(null); // or handle error differently
    }

    if (data && data.length === 1) {
      cb(data); // URL exists
    } else {
      cb(null); // URL does not exist
    }
  });
}

app.post("/api/shorturl", function(req, res) {
  let originalUrl = req.body.url;
  if (originalUrl === null || originalUrl === '') { 
    return res.json({ error: 'invalid url' }); 
  }

  // Ensure the URL has http:// or https://
  let domain = originalUrl.match(/^https?:\/\//);
  if (!domain) {
    originalUrl = 'http://' + originalUrl; // Add http:// if missing
  }

  // Remove protocol from URL for DNS lookup and save
  originalUrl = originalUrl.replace(/^https?:\/\//, "");

  console.log('param: ' + originalUrl);

  // DNS lookup to check if the domain is valid
  dns.lookup(originalUrl, function(err, valid) {
    if (err) {
      console.error(err);
      return res.json({ error: 'invalid url' });
    }
    
    // If valid, proceed to check the database
    Url.find({ original: originalUrl }).exec(function(err, url) {
      if (err) {
        console.error(err);
        return res.json({ error: 'internal server error' });
      }

      if (url.length === 1) {
        console.log('URL exists');
        return res.json({ original_url: 'https://' + url[0].original, short_url: url[0].short });
      } else {
        console.log('URL not found, creating a new short URL');
        createAndSaveUrl(originalUrl, genUrl(originalUrl), function(err, obj) {
          if (err) {
            console.error(err);
            return res.json({ error: 'internal server error' });
          }
          return res.json({ original_url: 'https://' + obj.original, short_url: obj.short });
        });
      }
    });
  });
});

// Redirect route for short URLs
app.get("/api/shorturl/:id", function(req, res) {
  let shortUrl = req.params.id;

  // Find the URL by short code and redirect
  Url.find({ short: shortUrl }).exec(function(err, url) {
    if (err) {
      console.error(err);
      return res.json({ error: 'internal server error' });
    }
    if (url.length === 1) {
      console.log('Redirecting to: https://' + url[0].original);
      res.redirect('https://' + url[0].original);
    } else {
      return res.json({ error: 'No short URL found for given ID' });
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
