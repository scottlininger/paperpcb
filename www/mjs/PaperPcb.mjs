/**
 * @fileoverview Provides the master site object that runs the show.
 *     It's a SPA (single page app).
 */
import pour from './util/pour.mjs';
import { route, refresh, router } from './util/route.mjs';
import HomePage from './pages/HomePage.mjs';
import Page from './pages/Page.mjs';
import DocsPage from './pages/DocsPage.mjs';
import nav from './nav.mjs';


/**
 * Provide the master site class that runs as a single-page app.
 */
export default class PaperPcb {
  constructor () {
    
    /**
     * Tell our instance of pour to use this instance as the 
     * context for in-template javascript.
     */
    pour.context = this;

    /**
     * A handy collection of navigation links.
     */
    this.nav = nav;
    
    this.panel = document.body;
    
    /**
     * Watch for SPA navigation.
     */
    route('/', new HomePage(this));
    //route('/games/:gameId', new GamePage(this));
    route('/?', new DocsPage(this));
    
    
    // Some references for easier debugging.
    this.refresh = refresh;
    this.router = router;
    

    this.init();
  }

 
  /**
   * Initialize the site.
   */ 
  async init () {

    this.refresh();
  }

  
  /**
   * Shows the sidebar nav on mobile. Go hamburger!
   */
  showMobileNav () {
    const menu = document.getElementById('documentation-menu');
    
    menu.classList.add('is-open-on-mobile');  
  }
  
  
  /**
   * Hides the sidebar nav on mobile. Go X!
   */
  hideMobileNav () {
    const menu = document.getElementById('documentation-menu');
    
    menu.classList.remove('is-open-on-mobile');  
  }
}
