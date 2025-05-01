require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://yara01:CHmc7pWgoaYOhpPx@cluster0.hgsirvn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true });

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static(`${process.cwd()}/public`));

// Database Schema
const urlSchema = new mongoose.Schema({
  original: String,
  short: Number
});

const Url = mongoose.model('Url', urlSchema);

// Helper Functions
const createAndSaveUrl = function(original, short, done) {
  let genUrl = new Url({ original: original, short: short });
  genUrl.save(function(err, data) {
    if (err) return console.error(err);
    done(null, data);
  });
};

// Generate a random short URL
function genUrl(url) {
  let min = 1;
  let max = 100;
  let num = Math.floor(Math.random() * (max - min + 1)) + min;
  return num;
}

// POST /api/shorturl to shorten the URL
app.post("/api/shorturl", function(req, res) {
  let originalUrl = req.body.url;

  // Validate URL format (ensure it's a valid HTTP/HTTPS URL)
  if (!/^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  // Remove protocol from URL for DNS lookup and save
  originalUrl = originalUrl.replace(/^https?:\/\//, "");

  // Check if the URL is already in the database
  Url.find({ original: originalUrl }).exec(function(err, url) {
    if (err) {
      console.error(err);
      return res.json({ error: 'internal server error' });
    }

    // If URL exists, return the short URL
    if (url.length === 1) {
      return res.json({ original_url: 'https://' + url[0].original, short_url: url[0].short });
    } else {
      // If URL doesn't exist, create a new entry with a unique short URL
      let shortUrl = genUrl(originalUrl);
      // Ensure short URL is unique
      while (Url.exists({ short: shortUrl })) {
        shortUrl = genUrl(originalUrl);  // Regenerate until unique
      }
      createAndSaveUrl(originalUrl, shortUrl, function(err, obj) {
        if (err) {
          console.error(err);
          return res.json({ error: 'internal server error' });
        }
        return res.json({ original_url: 'https://' + obj.original, short_url: obj.short });
      });
    }
  });
});

// Redirect to original URL by short URL
app.get("/api/shorturl/:id", function(req, res) {
  let shortUrl = req.params.id;

  // Find the URL by short code and redirect
  Url.find({ short: shortUrl }).exec(function(err, url) {
    if (err) {
      console.error(err);
      return res.json({ error: 'internal server error' });
    }
    if (url.length === 1) {
      // Redirect to the original URL
      res.redirect('https://' + url[0].original);
    } else {
      return res.json({ error: 'No short URL found for given ID' });
    }
  });
});

// Start the server
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
