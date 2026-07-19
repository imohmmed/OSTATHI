/**
 * RichTextEditor — WYSIWYG editor powered by an embedded WebView.
 * Supports: Bold, Italic, Underline, H1/H2, lists, font size, 5 text colors, RTL.
 * Content is stored & returned as HTML.
 */
import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useColors } from '@/hooks/useColors';

interface Props {
  initialHTML?: string;
  onChange?: (html: string) => void;
  minHeight?: number;
}

const buildEditorHTML = (bgColor: string, textColor: string, borderColor: string, primary: string) => `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
html,body{width:100%;background:${bgColor};font-family:-apple-system,Arial,sans-serif;}
.toolbar{display:flex;flex-direction:row;flex-wrap:wrap;gap:4px;padding:10px 8px;
  background:rgba(255,255,255,0.06);border-bottom:1px solid ${borderColor};direction:rtl;
  position:sticky;top:0;z-index:10;}
.tb{background:rgba(255,255,255,0.12);border:1px solid ${borderColor};border-radius:7px;
  color:${textColor};padding:5px 10px;font-size:14px;cursor:pointer;min-width:34px;
  text-align:center;-webkit-tap-highlight-color:transparent;}
.tb:active,.tb.on{background:${primary};}
.sel{background:rgba(255,255,255,0.12);border:1px solid ${borderColor};border-radius:7px;
  color:${textColor};padding:5px 6px;font-size:13px;}
.div{width:1px;background:${borderColor};margin:2px 3px;align-self:stretch;}
.cc{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);padding:0;min-width:22px;}
.sec{padding:6px 8px;font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:1px;}
#ed{min-height:180px;padding:14px;outline:none;direction:rtl;
  text-align:right;font-size:16px;color:${textColor};line-height:1.75;
  word-break:break-word;}
#ed h1{font-size:1.7em;margin-bottom:.5em;font-weight:700;}
#ed h2{font-size:1.3em;margin-bottom:.4em;font-weight:700;}
#ed ul{padding-right:20px;margin-bottom:.6em;}
#ed ol{padding-right:20px;margin-bottom:.6em;}
#ed li{margin-bottom:3px;}
#ed p{margin-bottom:.7em;}
#ed blockquote{border-right:3px solid ${primary};padding-right:10px;
  color:rgba(255,255,255,0.6);margin:.5em 0;}
#ed a{color:${primary};}
.placeholder{color:rgba(255,255,255,0.25);}
</style>
</head>
<body>
<div class="toolbar">
  <span class="sec">تنسيق</span>
  <button class="tb" onclick="f('bold')" title="عريض"><b>ع</b></button>
  <button class="tb" onclick="f('italic')" title="مائل"><i>م</i></button>
  <button class="tb" onclick="f('underline')" title="تسطير"><u>س</u></button>
  <button class="tb" onclick="f('strikeThrough')" title="شطب"><s>ش</s></button>
  <div class="div"></div>
  <button class="tb" onclick="f('formatBlock','H1')">ع١</button>
  <button class="tb" onclick="f('formatBlock','H2')">ع٢</button>
  <button class="tb" onclick="f('formatBlock','P')">ن</button>
  <button class="tb" onclick="f('formatBlock','BLOCKQUOTE')">❝</button>
  <div class="div"></div>
  <button class="tb" onclick="f('insertUnorderedList')">•</button>
  <button class="tb" onclick="f('insertOrderedList')">١.</button>
  <div class="div"></div>
  <select class="sel" onchange="sz(this.value)">
    <option value="1">صغير</option>
    <option value="3" selected>متوسط</option>
    <option value="5">كبير</option>
    <option value="7">كبير جداً</option>
  </select>
  <div class="div"></div>
  <button class="tb cc" style="background:#fff;border-color:#fff" onclick="fc('#000000')"></button>
  <button class="tb cc" style="background:#fbbf24" onclick="fc('#fbbf24')"></button>
  <button class="tb cc" style="background:#34d399" onclick="fc('#34d399')"></button>
  <button class="tb cc" style="background:#60a5fa" onclick="fc('#60a5fa')"></button>
  <button class="tb cc" style="background:#f87171" onclick="fc('#f87171')"></button>
  <button class="tb cc" style="background:#c084fc" onclick="fc('#c084fc')"></button>
  <div class="div"></div>
  <button class="tb" onclick="f('justifyRight')">⇐</button>
  <button class="tb" onclick="f('justifyCenter')">≡</button>
  <button class="tb" onclick="f('justifyLeft')">⇒</button>
</div>
<div id="ed" contenteditable="true" dir="rtl" spellcheck="false"></div>
<script>
var ed=document.getElementById('ed');
var _ph=false;
function showPH(){if(!ed.textContent.trim()&&!_ph){ed.innerHTML='<p class="placeholder">ابدأ الكتابة هنا...</p>';_ph=true;}}
function hidePH(){if(_ph){ed.innerHTML='';_ph=false;}}
ed.addEventListener('focus',hidePH);
ed.addEventListener('blur',showPH);
showPH();
function f(cmd,val){document.execCommand(cmd,false,val||null);ed.focus();send();}
function sz(v){document.execCommand('fontSize',false,v);ed.focus();send();}
function fc(c){document.execCommand('foreColor',false,c);ed.focus();send();}
function send(){
  var html=_ph?'':ed.innerHTML;
  window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({t:'html',v:html}));
}
ed.addEventListener('input',send);
ed.addEventListener('keyup',send);
window.loadContent=function(h){if(h){_ph=false;ed.innerHTML=h;}};
setTimeout(function(){send();},100);
</script>
</body>
</html>`;

export function RichTextEditor({ initialHTML = '', onChange, minHeight = 300 }: Props) {
  const colors = useColors();
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  const html = buildEditorHTML(colors.card, colors.foreground, colors.border, colors.primary);

  const onLoad = () => {
    setReady(true);
    if (initialHTML) {
      webRef.current?.injectJavaScript(
        `window.loadContent(${JSON.stringify(initialHTML)});true;`
      );
    }
  };

  const onMessage = (e: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.t === 'html') onChange?.(msg.v);
    } catch {}
  };

  return (
    <View style={[styles.wrap, { borderColor: colors.border, borderRadius: 14, minHeight, overflow: 'hidden' }]}>
      {!ready && (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loaderText, { color: colors.mutedForeground }]}>جاري تحميل المحرر...</Text>
        </View>
      )}
      <WebView
        ref={webRef}
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        onLoad={onLoad}
        onMessage={onMessage}
        scrollEnabled
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1 },
  loader: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  loaderText: { fontFamily: 'Tajawal_400Regular', fontSize: 13 },
});
