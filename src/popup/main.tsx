import { render } from 'preact';

import { App } from './App';
import './style.css';

document.title = chrome.i18n.getMessage('app_name_short');

render(<App />, document.getElementById('root') as HTMLElement);
