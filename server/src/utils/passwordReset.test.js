import assert from 'node:assert/strict';
import { buildPasswordResetUrl } from './passwordReset.js';

const req = {
  protocol: 'http',
  get(name) {
    const values = {
      host: 'localhost:5000',
      origin: 'http://localhost:3000',
    };
    return values[name];
  },
};

const url = buildPasswordResetUrl(req, 'abc123');
assert.equal(url, 'http://localhost:3000/reset-password?token=abc123');
console.log('password reset url test passed');
