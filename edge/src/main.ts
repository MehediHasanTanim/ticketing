import { createApp } from './server';
import { cellName } from '@adapters/postgres/config';

const port = Number(process.env.PORT ?? 3000);
createApp().listen(port, () => {
  console.log(`[jazzticketing] cell=${cellName()} listening on ${port}`);
});
