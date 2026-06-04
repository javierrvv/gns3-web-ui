import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Terminal } from 'xterm';
import { AttachAddon } from 'xterm-addon-attach';
import { FitAddon } from 'xterm-addon-fit';
import { Node } from '../../../cartography/models/node';
import { Project } from '../../../models/project';
import { Server } from '../../../models/server';
import { NodeConsoleService } from '../../../services/nodeConsole.service';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'app-web-console',
  templateUrl: './web-console.component.html',
  styleUrls: ['../../../../../node_modules/xterm/css/xterm.css', './web-console.component.scss'],
})
export class WebConsoleComponent implements OnInit, AfterViewInit {
  @Input() server: Server;
  @Input() project: Project;
  @Input() node: Node;

  public term: Terminal = new Terminal();
  public fitAddon: FitAddon = new FitAddon();
  private copiedText: string = '';

  @ViewChild('terminal') terminal: ElementRef;

  constructor(private consoleService: NodeConsoleService) {}

  ngOnInit() {
    this.consoleService.consoleResized.subscribe((ev) => {
      let numberOfColumns = Math.floor(ev.width / 9);
      let numberOfRows = Math.floor(ev.height / 17);

      this.consoleService.setNumberOfColumns(numberOfColumns);
      this.consoleService.setNumberOfRows(numberOfRows);

      this.term.resize(numberOfColumns, numberOfRows);
    });

    if (this.consoleService.getNumberOfColumns() && this.consoleService.getNumberOfRows()) {
      this.term.resize(this.consoleService.getNumberOfColumns(), this.consoleService.getNumberOfRows());
    }
  }

  ngAfterViewInit() {
    this.term.open(this.terminal.nativeElement);
    this.term.setOption('theme', { background: '#000000', foreground: '#ffffff', cursor: '#ffffff' });

    const socket = new WebSocket(this.consoleService.getUrl(this.server, this.node));

    socket.onerror = (event) => {
      this.term.write('Connection lost');
    };
    socket.onclose = (event) => {
      this.consoleService.closeConsoleForNode(this.node);
    };

    const attachAddon = new AttachAddon(socket);
    this.term.loadAddon(attachAddon);
    this.term.setOption('cursorBlink', true);
    this.term.loadAddon(this.fitAddon);
    this.fitAddon.activate(this.term);
    this.term.focus();

    this.term.attachCustomKeyEventHandler((key: KeyboardEvent) => this.handleClipboardShortcut(key));
  }

  private handleClipboardShortcut(key: KeyboardEvent): boolean {
    if (!key.ctrlKey || key.shiftKey || key.altKey || key.metaKey) return true;

    if (key.code === 'KeyC') {
      const selection = this.term.getSelection();
      if (!selection) return true;

      navigator.clipboard.writeText(selection);
      return false;
    }

    if (key.code === 'KeyV') {
      navigator.clipboard.readText().then((text) => {
        if (text) this.term.paste(text);
      });
      return false;
    }

    return true;
  }
}
