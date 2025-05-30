import test from 'node:test';
import assert from 'node:assert';

import { crearArticulo } from '../../src/controllers/articulos.js';

test('Crear un articulo con body inválido es un Error 400', async () => {

  const req = {
    body: {} 
  };

  const res = {
    statusCode: null,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };

  await crearArticulo(req, res);


  assert.strictEqual(res.statusCode, 400);
  assert.ok(res.data.error); 
});