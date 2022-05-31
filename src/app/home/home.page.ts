import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { InAppBrowser, InAppBrowserObject } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { interval, Observable, Subscription, timer } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnDestroy {
  message: string;
  message$: Observable<string>;
  browser: InAppBrowserObject;
  messageSubscription: Subscription;
  loadStopSubscription: Subscription;
  exitSubscription: Subscription;
  countDownSub: Subscription;
  timerSub: Subscription;

  constructor(private iab: InAppBrowser, private ref: ChangeDetectorRef) {}

  public openIabWithIabToAppCommunication(): void {
    this.browser = this.iab.create('https://vorderpneu.github.io/iab_content/iab_one_way.html', '_blank');

    //subscribe to webkit.messageHandlers.cordova_iab.postMessage
    this.message$ = this.browser.on('message').pipe(map((event) => event.data.message));
    this.messageSubscription = this.message$.subscribe((message) => {
      console.log(`message from IAB: ${message}`);
      this.message = message;
      this.ref.detectChanges();
    });

    //add browsermessage logic via executeScript
    this.loadStopSubscription = this.browser.on('loadstop').subscribe(() => {

      //case 1: execute remote script
      this.browser.executeScript({file: 'send_message_to_iab.js'});

      //case 2: execute local code
      this.browser.executeScript({code:
          'document.getElementById(\'executeScriptLocalButton\').onclick = () => {\n' +
          '    const message = document.getElementById(\'messageInput\').value;\n' +
          '    if(!webkit.messageHandlers.cordova_iab) throw "Cordova IAB postMessage API not found!";\n' +
          '    webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify({\n' +
          '        message: message\n' +
          '    }));' +
          '}'
      });

      this.exitSubscription = this.browser.on('exit').subscribe(() => {
        this.messageSubscription.unsubscribe();
        this.loadStopSubscription.unsubscribe();
      });
    });
  };

  public openIabWithTwoWayCommunication(): void {
    this.browser = this.iab.create('https://vorderpneu.github.io/iab_content/iab_two_way.html', '_blank');
    //Show countown in IAB and close IAB when count down is over
    this.initCountdown();

    this.browser.executeScript({file: 'eventListeners.js'});

    this.message$ = this.browser.on('message').pipe(map((event) => event.data.message));

    this.messageSubscription = this.message$.subscribe((message) => {
      console.log(`message from IAB: ${message}`);
      if (message === 'resetTimer') {
        this.countDownSub.unsubscribe();
        this.timerSub.unsubscribe();
        this.updateCountdownElement('timer has been reset!');
        this.initCountdown();
      }
    });

    this.exitSubscription = this.browser.on('exit').subscribe(() => {
      this.countDownSub.unsubscribe();
      this.timerSub.unsubscribe();
    });
  }

  public initCountdown() {
    const oneSec = 1000;
    const time = 5000;
    const timerInterval$ = interval(oneSec);
    const timer$ = timer(time * oneSec);
    const countDown$ = timerInterval$.pipe(take(time));

    this.countDownSub = countDown$.subscribe(val => {
        console.log(`send time left to IAB: ${time - val}`);
        this.updateCountdownElement(`${time - val}`);
      }
    );
    this.timerSub = timer$.subscribe(val => {
      console.log(`send 'time is up!' to IAB and close IAB`);
      this.updateCountdownElement('time is up!');
      setTimeout(() => this.browser.close(), 3 * oneSec);
    });
  }

  public updateCountdownElement(msg: string) {
    this.browser.executeScript({code: `console.log('timer: ${msg}'); document.getElementById('countdown').innerHTML = '<p>${msg}</p>'`});
    this.browser.executeScript({file: `script_with_param.js?param=${msg}`})
  }

  ngOnDestroy() {
    this.exitSubscription.unsubscribe();
  }
}
