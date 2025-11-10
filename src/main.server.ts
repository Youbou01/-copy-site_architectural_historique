import { bootstrapApplication, type BootstrapContext } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

// Angular 20 SSR requires passing a BootstrapContext when using bootstrapApplication on the server.
// The context is provided by the SSR engine and includes the incoming request and other metadata.
export default function bootstrapServer(context: BootstrapContext) {
  // No need to manually provide BootstrapContext; Angular SSR runtime passes it in.
  return bootstrapApplication(App, config, context);
}
