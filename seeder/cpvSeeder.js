const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Cpv = require('../models/cpvModel');
const fs = require('fs');
const catchAsync = require('./../utils/catchAsync');

// Read config from .env file
dotenv.config({ path: './../.env' });

const connecToMongo = async () => {
  // Set database config
  const DB =
    process.env.NODE_ENV === 'development'
      ? process.env.DATABASE.replace(
          '<PASSWORD>',
          process.env.DATABASE_PASSWORD
        )
      : process.env.DATABASE;

  // Connect to database
  mongoose
    .connect(DB, {
      useNewUrlParser: true,
    })
    .then(() => {
      console.log('DB connection successful!');
    });
};

const assignType = (code) => {
  if (code.substring(2, code.length) === '000000') {
    return 'division';
  }
  if (code.substring(3, code.length) === '00000') {
    return 'group';
  }
  if (code.substring(4, code.length) === '0000') {
    return 'class';
  }

  return 'category';
};

function CpvObj(code, de, en, es, fr, it) {
  this.code = code;
  this.name = {
    es: es,
    en: en,
    fr: fr,
    de: de,
    it: it,
  };
  this.parent = null;
  let str = code.substr(0, code.length - 2);
  this.type = assignType(str);
}

const run = catchAsync(async () => {
  console.log('start...');
  await connecToMongo();

  // Read file
  var data = fs.readFileSync(`${__dirname}/data/cpvs.csv`, 'utf8');
  data = data.split('\r\n');
  data.shift();

  const cpvs = [];
  let posChar;
  let el;

  // Store it in an array full of cpvs objects
  data.forEach((line) => {
    posChar = [];
    if (line.includes(`"`)) {
      el = line;

      for (let i = 0; i < el.length; i++) {
        if (line[i] === `"`) {
          posChar.push(i);
        }
      }

      const frase = [];

      for (i = 0; i < posChar.length; i = i + 2) {
        frase.push(el.substring(posChar[i], posChar[i + 1] + 1));
      }

      const map = frase.map((el) => el.replaceAll(';', '*'));
      i = 0;

      map.forEach((element) => {
        el = el.replace(frase[i], element);
        i++;
      });

      el = el.split(';');
      final = [];

      el.forEach((pos) => {
        if (pos.includes('*')) {
          final.push(pos.replaceAll('*', ';'));
        } else {
          final.push(pos);
        }
      });

      cpvs.push(
        new CpvObj(final[0], final[4], final[6], final[7], final[10], final[14])
      );
    } else {
      el = line.split(';');
      cpvs.push(new CpvObj(el[0], el[4], el[6], el[7], el[10], el[14]));
    }
  });

  // Save to DB without parent field
  for (const element of cpvs) {
    await Cpv.create({
      code: element.code.split('-')[0],
      name: element.name,
      type: element.type,
    });
  }

  const cpvsDB = await Cpv.find();
  let parent = Object.assign(cpvsDB[0]);
  let parentLvl2;
  let parentLvl3;
  let parentLvl4;
  let parentLvl5;
  let parentLvl6;

  // Save to DB with parent field
  for (let i = 0; i < cpvsDB.length; i++) {
    let newCpv = null;

    if (cpvsDB[i].type !== 'division') {
      if (cpvsDB[i].type === 'group' || cpvsDB[i].type === 'class') {
        if (cpvsDB[i].type === 'group') {
          newCpv = await Cpv.findByIdAndUpdate(
            cpvsDB[i]._id,
            {
              parent: parent._id,
            },
            {
              new: true,
            }
          );

          parentLvl2 = Object.assign(newCpv);
        }
        if (cpvsDB[i].type === 'class') {
          newCpv = await Cpv.findByIdAndUpdate(
            cpvsDB[i]._id,
            {
              parent: parentLvl2._id,
            },
            {
              new: true,
            }
          );

          parentLvl3 = Object.assign(newCpv);
        }
      } else if (cpvsDB[i].code.substring(5, cpvsDB[i].code.length) === '000') {
        newCpv = await Cpv.findByIdAndUpdate(
          cpvsDB[i]._id,
          {
            parent: parentLvl3._id,
          },
          {
            new: true,
          }
        );

        parentLvl4 = Object.assign(newCpv);
      } else if (cpvsDB[i].code.substring(6, cpvsDB[i].code.length) === '00') {
        newCpv = await Cpv.findByIdAndUpdate(
          cpvsDB[i]._id,
          {
            parent: parentLvl4._id,
          },
          {
            new: true,
          }
        );

        parentLvl5 = Object.assign(newCpv);
      } else if (cpvsDB[i].code.substring(7, cpvsDB[i].code.length) === '0') {
        newCpv = await Cpv.findByIdAndUpdate(
          cpvsDB[i]._id,
          {
            parent: parentLvl5._id,
          },
          {
            new: true,
          }
        );

        parentLvl6 = Object.assign(newCpv);
      } else if (cpvsDB[i].code.substring(7, cpvsDB[i].code.length) !== '0') {
        newCpv = await Cpv.findByIdAndUpdate(
          cpvsDB[i]._id,
          {
            parent: parentLvl6._id,
          },
          {
            new: true,
          }
        );
      }
    } else {
      parent = Object.assign(cpvsDB[i]);
    }
  }

  mongoose.connection.close();
  console.log('...success');
});

run();
