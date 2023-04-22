import Homey from 'homey';

class DucoApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('Duco has been initialized');
  }

}

module.exports = DucoApp;
