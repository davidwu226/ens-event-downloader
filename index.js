const fs = require('fs')
if (fs.existsSync('./dist')) {
  require('./dist')
} else {
  require("@babel/register")
  require('./src')
}
