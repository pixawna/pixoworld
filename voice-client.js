// WebRTC audio goes directly to the provider; the long-lived API key stays on the server.
export class PixoVoice {
  constructor(onState, onTranscript, onSpeaking) {
    this.onState=onState;this.onTranscript=onTranscript;this.onSpeaking=onSpeaking;
    this.generation=0;this.state='idle';this.muted=false;
  }
  status(value,message=value){this.state=value;this.onState(value,message);}
  async start({endpoint,accessCode,context=''}) {
    this.stop();const generation=this.generation;
    const url=new URL(endpoint);
    if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('Use an HTTPS voice server (or localhost for development).');
    if(!accessCode||accessCode.startsWith('sk-'))throw new Error('Enter the voice server’s access code, not an OpenAI API key.');
    if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)throw new Error('This browser does not support secure microphone calls.');
    this.status('connecting','Requesting microphone permission…');
    this.controller=new AbortController();
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;
      const pc=this.pc=new RTCPeerConnection();
      const audio=this.audio=document.createElement('audio');audio.autoplay=true;
      pc.ontrack=event=>{audio.srcObject=event.streams[0];audio.play().catch(()=>this.status('connected','Tap Resume audio to hear Pixo.'));};
      stream.getTracks().forEach(track=>pc.addTrack(track,stream));
      const channel=this.channel=pc.createDataChannel('oai-events');
      channel.onopen=()=>{if(generation!==this.generation)return;clearTimeout(this.connectTimeout);this.status('connected','Listening — say hello.');};
      channel.onmessage=e=>{
        if(generation!==this.generation)return;
        let event;try{event=JSON.parse(e.data);}catch{return;}
        if(event.type==='input_audio_buffer.speech_started'){this.onSpeaking(false);this.status('connected','Listening…');}
        if(event.type==='input_audio_buffer.speech_stopped')this.status('connected','Pixo is thinking…');
        if(event.type==='output_audio_buffer.started'){this.onSpeaking(true);this.status('connected','Pixo is speaking…');}
        if(['output_audio_buffer.stopped','output_audio_buffer.cleared'].includes(event.type)){this.onSpeaking(false);this.status('connected',this.muted?'Microphone muted':'Listening…');}
        if(event.type==='response.output_audio_transcript.done')this.onTranscript(String(event.transcript||''));
        if(event.type==='error'){this.stop();this.status('error','The voice provider returned an error. End the call and try again.');}
      };
      pc.onconnectionstatechange=()=>{if(generation!==this.generation)return;if(['failed','closed','disconnected'].includes(pc.connectionState)){this.stop();this.status('error','Voice connection ended. You can reconnect.');}};
      this.timeout=setTimeout(()=>{this.stop();this.status('idle','Call ended after 10 minutes. Start another when you’re ready.');},10*60*1000);
      this.connectTimeout=setTimeout(()=>{this.stop();this.status('error','Connection timed out. Check your voice server.');},30000);
      const offer=await pc.createOffer();await pc.setLocalDescription(offer);
      this.status('connecting','Connecting to your voice server…');
      const response=await fetch(url.href,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessCode}`},body:JSON.stringify({sdp:offer.sdp,context:context.slice(0,3000)}),signal:this.controller.signal});
      if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(detail.error||`Voice server returned ${response.status}.`);}
      const answer=await response.text();
      if(generation!==this.generation)return;
      await pc.setRemoteDescription({type:'answer',sdp:answer});
    } catch(error) {
      if(generation!==this.generation)return;
      this.stop();this.status('error',error.name==='NotAllowedError'?'Microphone permission was denied. You control access in browser settings.':error.message||'Could not connect.');
    }
  }
  mute(){this.muted=!this.muted;this.stream?.getAudioTracks().forEach(t=>{t.enabled=!this.muted;});this.status(this.state,this.muted?'Microphone muted':'Listening…');return this.muted;}
  resume(){return this.audio?.play();}
  stop(){
    this.generation++;clearTimeout(this.timeout);clearTimeout(this.connectTimeout);this.controller?.abort();
    this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;
    if(this.pc){this.pc.onconnectionstatechange=null;this.pc.close();this.pc=null;}
    this.channel?.close();this.channel=null;if(this.audio){this.audio.pause();this.audio.srcObject=null;this.audio=null;}
    this.muted=false;this.onSpeaking(false);this.status('idle','Microphone off');
  }
}
