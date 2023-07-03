const express = require('express');
const mysql = require('mysql2');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { authenticate } = require('./middleware');
require('dotenv').config();

const server = express();
server.use(express.json());
server.use(cors());

const mysqlConfig = {
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASS,
  database: 'bill',
};

const userSchema = Joi.object({
  full_name: Joi.string(),
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().required(),
});
const accountSchema = Joi.object({
  group_id: Joi.number().integer().required(),
});
const dbPool = mysql.createPool(mysqlConfig).promise();

server.get('/', authenticate, (req, res) => {
  console.log(req.user);
  res.status(200).send({ message: 'Authorized' });
});

server.get('/groups', authenticate, async (req, res) => {
  try {
    const [groups] = await dbPool.execute(
      'SELECT my_groups.name, my_groups.id FROM accounts JOIN my_groups ON my_groups_id WHERE accounts.users_id=? ',
      [req.user.id]
    );
    return res.json(groups);
  } catch (error) {
    console.log(error);
    return res.status(500).end();
  }
});

server.get('/bills/:group_id', authenticate, async (req, res) => {
  try {
    const { group_id } = req.params;

    const [bills] = await dbPool.execute(
      'SELECT id, amount, description FROM bills WHERE my_groups_id = ?',
      [group_id]
    );

    return res.status(200).json(bills);
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }
});

server.get('/accounts', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const [accounts] = await dbPool.execute(
      'SELECT my_groups.name FROM accounts JOIN my_groups ON accounts.my_groups_id = my_groups.id WHERE accounts.users_id = ?',
      [user_id]
    );
    const groupNames = accounts.map((account) => account.name);
    return res.json(groupNames);
  } catch (error) {
    console.log(error);
    return res.status(500).end();
  }
});

server.post('/login', async (req, res) => {
  let payload = req.body;

  try {
    payload = await userSchema.validateAsync(payload);
  } catch (error) {
    console.error(error);

    return res.status(400).send({ error: 'All fields are required' });
  }

  try {
    const [data] = await dbPool.execute(
      `
        SELECT * FROM users
        WHERE email = ?
    `,
      [payload.email]
    );

    if (!data.length) {
      return res.status(400).send({ error: 'Email or password did not match' });
    }

    const isPasswordMatching = await bcrypt.compare(
      payload.password,
      data[0].password
    );

    if (isPasswordMatching) {
      const token = jwt.sign(
        {
          email: data[0].email,
          id: data[0].id,
        },
        process.env.JWT_SECRET
      );
      return res.status(200).send({ token });
    }

    return res.status(400).send({ error: 'Email or password did not match' });
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
});

server.post('/register', async (req, res) => {
  let payload = req.body;

  try {
    payload = await userSchema.validateAsync(payload);
  } catch (err) {
    console.error(err);

    return res.status(400).send({ error: 'All fields are required' });
  }

  try {
    const encryptedPassword = await bcrypt.hash(payload.password, 10);
    const [response] = await dbPool.execute(
      `
            INSERT INTO users (full_name, email, password)
            VALUES (?, ?, ?)
        `,
      [payload.full_name, payload.email, encryptedPassword]
    );
    const token = jwt.sign(
      {
        email: payload.email,
        id: response.insertId,
        full_name: payload.full_name,
      },
      process.env.JWT_SECRET
    );
    return res.status(201).send({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).end();
  }
});

server.post('/groups', authenticate, async (req, res) => {
  try {
    const { group_id } = req.body;

    const [group] = await dbPool.execute(
      'SELECT name FROM my_groups WHERE id = ?',
      [group_id]
    );

    if (group.length === 0) {
      return res.status(404).json({ error: 'Group does not exist' });
    }

    const groupName = group[0].name !== undefined ? group[0].name : null;

    const [result] = await dbPool.execute(
      'INSERT INTO my_groups (id, name) VALUES (?, ?)',
      [group_id, groupName]
    );

    const newGroupId = result.insertId;

    return res.status(201).json({ id: newGroupId });
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }
});

server.post('/accounts', authenticate, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { error, value } = accountSchema.validate(req.body);

    if (error) {
      return res
        .status(400)
        .json({ error: 'Invalid data', details: error.details });
    }

    const { group_id } = value;

    const [group] = await dbPool.execute(
      'SELECT * FROM my_groups WHERE id = ?',
      [group_id]
    );
    if (group.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const [existingAccount] = await dbPool.execute(
      'SELECT * FROM accounts WHERE users_id = ? AND my_groups_id = ?',
      [user_id, group_id]
    );
    if (existingAccount.length > 0) {
      return res
        .status(409)
        .json({ error: 'User already assigned to this group' });
    }

    await dbPool.execute(
      'INSERT INTO accounts (users_id, my_groups_id) VALUES (?, ?)',
      [user_id, group_id]
    );

    return res.status(201).json({ message: 'Account created successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }
});

server.post('/bills', authenticate, async (req, res) => {
  try {
    const { group_id, amount, description } = req.body;

    const [result] = await dbPool.execute(
      'INSERT INTO bills (my_groups_id, amount, description) VALUES (?, ?, ?)',
      [group_id, amount, description]
    );

    if (result.affectedRows === 1) {
      return res.status(201).json({ message: 'Bill successfully created' });
    } else {
      return res.status(500).json({ error: 'Failed to create bill' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).end();
  }
});

server.listen(process.env.PORT, () =>
  console.log(`Server is listening to ${process.env.PORT} port`)
);
