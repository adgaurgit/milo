import './job.js';
import { LitElement, html } from '../../deps/lit-all.min.js';
import { getSheet } from '../../../tools/utils/utils.js';
import { createJobs } from './services.js';
import {
  editEntry,
  FORM_MODES,
  PROCESS_MAX,
  PROCESS_TYPES,
  selectOverage,
  validMiloURL,
  userPrefs,
  getJobErrorText,
} from './utils.js';

const styles = await getSheet('/libs/blocks/bulk-publish/bulk-publisher.css');
const loader = await getSheet('/libs/blocks/bulk-publish/loader.css');

class BulkPublish extends LitElement {
  static properties = {
    mode: { state: true },
    urls: { state: true },
    processType: { state: true },
    disabled: { state: true },
    editing: { state: true },
    processing: { state: true },
    jobs: { state: true },
    openJobs: { state: true },
    jobErrors: { state: true },
  };

  constructor() {
    super();
    this.mode = userPrefs().get('mode');
    this.urls = [];
    this.processType = 'choose';
    this.disabled = true;
    this.processing = false;
    this.editing = false;
    this.jobs = [];
    this.openJobs = false;
    this.jobErrors = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.renderRoot.adoptedStyleSheets = [styles, loader];
  }

  async updated() {
    if (userPrefs().get('mode') !== this.mode) {
      userPrefs().set('mode', this.mode);
    }
    if (this.mode === 'full' && !this.openJobs && this.urls.length) {
      const textarea = this.renderRoot.querySelector('#Urls');
      textarea.value = this.urls.join('\r\n');
    }
  }

  setType(e) {
    if (e.target.value !== this.processType) {
      this.processType = e.target.value;
    }
  }

  setUrls(e) {
    const urls = e.target.value.replace(/\n/g, ' ').split(' ').filter((ur) => (ur.length));
    this.urls = [...new Set(urls)];
    this.validateUrls();
  }

  validateUrls() {
    let errors = [];
    const invalid = this.jobErrors?.urls?.length
      ? this.urls.filter((url) => this.jobErrors.urls.includes(url))
      : this.urls.filter((url) => !validMiloURL(url) && url.length);

    if (invalid?.length) {
      errors = [...errors, ...invalid];
    }
    if (this.urls.length > PROCESS_MAX) {
      errors.push('limit');
    }
    if (errors.length === 0) {
      errors = this.urls.length === 0;
    }
    this.disabled = errors;
    this.editing = false;
  }

  validationTools() {
    if (typeof this.disabled === 'boolean') return html``;
    const isMax = this.disabled[0] === 'limit';
    const { text, startEdit } = this.getErrorProps(isMax);
    startEdit();
    const count = this.disabled.length;
    const counter = count > 1 ? `1/${count} Errors` : '1 Error';
    const btnText = this.editing ? 'Next Error' : 'Select Line';
    return html`
      <div class="errors">
        <span>${counter}: <strong>${text}</strong></span>
        <div class="fix-btn" @click=${() => startEdit(true)}>
          ${count === 1 ? 'Finish' : btnText}
        </div>
      </div>
    `;
  }

  getErrorProps(isMax) {
    const textarea = this.renderRoot.getElementById('Urls');
    let text = isMax ? 'Invalid Quantity (max 1000 per job)' : 'Invalid Url';
    if (this.jobErrors) {
      text = getJobErrorText(this.jobErrors, this.processType);
    }
    return {
      text,
      startEdit: (tapped = null) => {
        this.editing = !this.editing;
        if (tapped) {
          if (this.jobErrors.length === 1) {
            this.jobErrors = false;
          } else {
            Object.keys(this.jobErrors).forEach((key) => this.jobErrors[key].shift());
          }
          this.validateUrls();
        } else {
          if (isMax) selectOverage(textarea, this.urls);
          editEntry(textarea, this.disabled[0]);
        }
      },
    };
  }

  renderForm() {
    if (this.openJobs && this.mode === 'full') {
      return html`
        <div class="panel-title" @click=${() => { this.openJobs = false; }}>
          <span class="title">
            <strong>+</strong>
            Start New Job
          </span>
        </div>`;
    }
    return html`
      <div class="process">
        <div class="processor">
          <select 
            id="ProcessSelect"
            name="select"
            value=${this.processType}
            @change=${this.setType}>
            <option disabled selected value="choose">Choose Process</option>
            ${PROCESS_TYPES.map((type) => (html`<option value=${type}>${type}</option>`))}
          </select>
          <button
            disable=${this.disableSubmitBtn()} 
            @click=${this.submitJob}>
            Run Job
            <span class="loader${this.processing === 'launch' ? '' : ' hide'}"></span>
          </button>
        </div>
        <label class="process-title" for="Urls">
          <strong>PAGE URLs</strong> - <i>Max 1000 per job</i>
        </label>
      </div>
      <div class="urls${typeof this.disabled !== 'boolean' ? ' invalid' : ''}">
        <div class="url-tools">${this.validationTools()}</div>
        <div class="checkmark${this.disabled ? '' : ' show'}"></div>
        <textarea 
          id="Urls"
          placeholder="Example: https://main--milo--adobecom.hlx.page/path/to/page"
          @blur=${this.setUrls}
          @change=${this.setUrls}></textarea>
      </div>
    `;
  }

  jobsTotal() {
    return this.jobs.reduce((count, { result }) => {
      const paths = result?.job?.data?.paths?.length ?? 0;
      return count + paths;
    }, 0);
  }

  getJobState() {
    const state = {
      showList: this.mode === 'half' || this.openJobs,
      showClear: this.jobs.length && this.processing !== 'job',
      showTools: this.mode === 'half' || this.openJobs,
      loading: this.processing === 'job',
    };
    Object.keys(state).forEach((key) => (state[key] = `${state[key] ? '' : ' hide'}`));
    return state;
  }

  renderJobs() {
    const { showList, showClear, showTools, loading } = this.getJobState();
    return html`
      <div
        class="panel-title"
        @click=${() => { this.openJobs = !!this.jobs.length; }}>
        <span class="title">
          ${this.jobs.length ? html`<strong>${this.jobsTotal()}</strong>` : ''}
          My Jobs
        </span>
        <div class="jobs-tools${showTools}">
          <div class="loading-jobs${loading}">
            <div class="loader"></div>
          </div>
          <div 
            class="clear-jobs${showClear}"
            @click=${() => { this.jobs = []; }}></div>
        </div>
      </div>
      <div class="job${showList}">
        <div class="job-head">
          <div class="job-url">JOB</div>
          <div class="job-meta">
            <span>STATUS</span>
            <span>DATE/TIME</span>
          </div>
        </div>
        <div class="job-list">
          ${this.jobs.map((job) => html`
            <job-process 
              .job=${job} 
              @processed="${() => { this.processing = false; }}"></job-process>
          `)}
        </div>
      </div>
    `;
  }

  disableSubmitBtn() {
    return this.disabled === true
      || typeof this.disabled !== 'boolean'
      || this.processType === 'choose';
  }

  resetForm() {
    this.disabled = true;
    this.jobErrors = false;
    this.urls = [];
    this.processType = 'choose';
    const urls = this.renderRoot.querySelector('#Urls');
    if (urls) urls.value = '';
    const process = this.renderRoot.querySelector('#ProcessSelect');
    if (process) process.value = 'choose';
  }

  setJobErrors(errors) {
    const urls = [];
    errors.forEach((error) => {
      const { href } = error;
      const matched = this.urls.filter((url) => url.includes(href));
      matched.forEach((match) => urls.push(match));
    });
    const textarea = this.renderRoot.querySelector('#Urls');
    textarea.value = urls.join('\r\n');
    this.urls = urls;
    this.disabled = urls;
    this.jobErrors = { urls, messages: errors.map((error) => (error.message)) };
  }

  async submitJob() {
    if (!this.disabled) {
      this.processing = 'launch';
      const newJobs = await createJobs({
        urls: this.urls,
        process: this.processType.toLowerCase(),
      });
      const errors = newJobs.filter((job) => job.error);
      this.jobs = [...this.jobs, ...newJobs.filter((job) => !job.error)];
      this.processing = 'job';
      if (errors.length) {
        this.setJobErrors(errors);
      } else {
        if (this.mode === 'full') {
          this.openJobs = true;
        }
        this.resetForm();
      }
    }
  }

  modeProps() {
    return {
      full: this.mode === 'full' ? 'on' : 'off',
      half: this.mode === 'half' ? 'on' : 'off',
      toggleMode: (modeIndex) => {
        this.mode = FORM_MODES[modeIndex];
      },
    };
  }

  render() {
    const { full, half, toggleMode } = this.modeProps();
    return html`
      <header id="Header">
        <h1>Bulk Publishing</h1>
        <div class="mode-switcher">
          <div class="switch full ${full}" @click=${() => toggleMode(0)}></div>
          <div class="switch half ${half}" @click=${() => toggleMode(1)}></div>
        </div>
      </header>
      <div id="BulkPublish" class="bulk-publisher ${this.mode}">
        <div active=${!this.openJobs} class="panel form">
          ${this.renderForm()}
        </div>
        <div active=${!!this.openJobs} class="panel results">
          ${this.renderJobs()}
        </div>
      </div>
    `;
  }
}

customElements.define('bulk-publish', BulkPublish);

export default async function init(el) {
  el.append(document.createElement('bulk-publish'));
}
