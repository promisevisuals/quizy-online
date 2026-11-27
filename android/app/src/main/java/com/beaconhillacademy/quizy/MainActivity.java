package com.beaconhillacademy.quizy;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.*;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.*;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.webkit.*;
import org.json.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

public class MainActivity extends Activity {
 private static final int REQ_BT=7001, REQ_DISCOVERABLE=7002;
 private static final UUID APP_UUID=UUID.fromString("8d4c1d2a-3e8b-4b16-a9f4-2b8d6d2a7c11");
 private static final String SERVICE_NAME="Quizy Battle", QUIZY_URL="https://quizy-online-rho.vercel.app/";
 private WebView webView; private ImageView splash; private BluetoothAdapter adapter; private BluetoothSocket socket; private BluetoothServerSocket serverSocket; private OutputStream output;
 private final ExecutorService io=Executors.newCachedThreadPool(); private final Handler main=new Handler(Looper.getMainLooper());
 @Override protected void onCreate(Bundle b){super.onCreate(b); adapter=BluetoothAdapter.getDefaultAdapter(); FrameLayout root=new FrameLayout(this); webView=new WebView(this); root.addView(webView,new FrameLayout.LayoutParams(-1,-1)); splash=new ImageView(this); splash.setImageResource(com.beaconhillacademy.quizy.R.drawable.quizy_brand); splash.setScaleType(ImageView.ScaleType.CENTER_INSIDE); GradientDrawable bg=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{Color.rgb(255,248,214),Color.rgb(225,245,255),Color.rgb(240,255,244)}); splash.setBackground(bg); splash.setPadding(24,48,24,48); FrameLayout.LayoutParams sp=new FrameLayout.LayoutParams(-1,-1); sp.gravity=Gravity.CENTER; root.addView(splash,sp); setContentView(root);
  webView.setBackgroundColor(Color.TRANSPARENT); webView.getSettings().setJavaScriptEnabled(true);webView.getSettings().setDomStorageEnabled(true);webView.setWebChromeClient(new WebChromeClient());webView.setWebViewClient(new WebViewClient(){ @Override public void onPageFinished(WebView view,String url){ super.onPageFinished(view,url); main.postDelayed(()->hideSplash(),650); }});
  webView.addJavascriptInterface(new QuizyBluetoothBridge(),"QuizyBluetooth");webView.addJavascriptInterface(new QuizyClipboardBridge(),"QuizyClipboard");webView.loadUrl(QUIZY_URL); requestBluetoothPermissions(); main.postDelayed(()->hideSplash(),3500); }
 private void hideSplash(){ if(splash==null||splash.getVisibility()!=View.VISIBLE)return; splash.animate().alpha(0f).setDuration(520).withEndAction(()->{splash.setVisibility(View.GONE);}).start(); }
 private boolean hasBtPermission(){if(Build.VERSION.SDK_INT<31)return true;return checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)==PackageManager.PERMISSION_GRANTED&&checkSelfPermission(Manifest.permission.BLUETOOTH_SCAN)==PackageManager.PERMISSION_GRANTED&&checkSelfPermission(Manifest.permission.BLUETOOTH_ADVERTISE)==PackageManager.PERMISSION_GRANTED;}
 private void requestBluetoothPermissions(){if(Build.VERSION.SDK_INT>=31&&!hasBtPermission())requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT,Manifest.permission.BLUETOOTH_SCAN,Manifest.permission.BLUETOOTH_ADVERTISE},REQ_BT);}
 private boolean enabled(){if(adapter==null){emitError("This phone does not support Bluetooth.");return false;}if(!adapter.isEnabled()){try{startActivity(new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE));}catch(Exception e){}emitStatus("Turn on Bluetooth, then tap Host or Join again.");return false;}return true;}
 private void emit(String event,JSONObject data){main.post(()->{try{JSONObject o=new JSONObject();o.put("event",event);o.put("data",data==null?new JSONObject():data);String arg=JSONObject.quote(o.toString());webView.evaluateJavascript("(function(){if(window.QuizyBluetoothEvent)window.QuizyBluetoothEvent("+arg+");})()",null);}catch(Exception ignored){}});}
 private void emitStatus(String m){try{JSONObject d=new JSONObject();d.put("message",m);emit("status",d);}catch(Exception ignored){}}
 private void emitError(String m){try{JSONObject d=new JSONObject();d.put("message",m);emit("error",d);}catch(Exception ignored){}}
 private void startReader(BluetoothSocket s){io.execute(()->{try{BufferedReader r=new BufferedReader(new InputStreamReader(s.getInputStream()));String line;while((line=r.readLine())!=null){JSONObject d=new JSONObject();d.put("payload",line);emit("message",d);}}catch(Exception e){}finally{emit("disconnected",new JSONObject());}});}
 private void setConnected(BluetoothSocket s)throws IOException{socket=s;output=s.getOutputStream();JSONObject d=new JSONObject();try{d.put("device",s.getRemoteDevice().getName()==null?"Quizy player":s.getRemoteDevice().getName());}catch(JSONException ignored){}emit("connected",d);startReader(s);}
 private void host(){if(!hasBtPermission()){requestBluetoothPermissions();emitError("Bluetooth permission is required.");return;}if(!enabled())return;io.execute(()->{try{main.post(()->{try{Intent i=new Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);i.putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION,300);startActivityForResult(i,REQ_DISCOVERABLE);}catch(Exception ignored){}});serverSocket=adapter.listenUsingRfcommWithServiceRecord(SERVICE_NAME,APP_UUID);emit("host_waiting",new JSONObject());BluetoothSocket s=serverSocket.accept();serverSocket.close();serverSocket=null;setConnected(s);}catch(Exception e){emitError(e.getMessage()==null?"Unable to host Bluetooth Battle.":e.getMessage());}});}
 private void connect(String address){if(!hasBtPermission()){requestBluetoothPermissions();emitError("Bluetooth permission is required.");return;}if(!enabled())return;io.execute(()->{BluetoothSocket s=null;try{BluetoothDevice d=adapter.getRemoteDevice(address);try{adapter.cancelDiscovery();}catch(Exception ignored){}s=d.createRfcommSocketToServiceRecord(APP_UUID);s.connect();setConnected(s);}catch(Exception e){try{if(s!=null)s.close();}catch(Exception ignored){}emitError("Could not connect to the other Quizy phone.");}});}
 private String pairedDevices(){JSONArray a=new JSONArray();if(!hasBtPermission()||adapter==null)return a.toString();try{for(BluetoothDevice d:adapter.getBondedDevices()){JSONObject o=new JSONObject();o.put("name",d.getName()==null?"Quizy player":d.getName());o.put("address",d.getAddress());a.put(o);}}catch(Exception ignored){}return a.toString();}
 private void send(String payload){if(output==null){emitError("Bluetooth is not connected.");return;}io.execute(()->{try{output.write((payload.replace("\n"," ")+"\n").getBytes("UTF-8"));output.flush();}catch(Exception e){emitError("Could not send the battle message.");}});}
 private String btState(){JSONObject o=new JSONObject();try{o.put("supported",adapter!=null);o.put("permission",hasBtPermission());o.put("enabled",adapter!=null&&hasBtPermission()&&adapter.isEnabled());o.put("connected",socket!=null&&socket.isConnected());o.put("version",3);}catch(Exception ignored){}return o.toString();}
 private void askBluetooth(){if(!hasBtPermission()){requestBluetoothPermissions();return;}if(adapter!=null&&!adapter.isEnabled()){try{startActivity(new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE));}catch(Exception ignored){}}emitStatus("ready");}
 private void openBtSettings(){try{startActivity(new Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS));}catch(Exception e){emitError("Open Bluetooth in your phone settings to pair.");}}
 private void closeLink(){try{if(socket!=null)socket.close();}catch(Exception ignored){}socket=null;output=null;try{if(serverSocket!=null)serverSocket.close();}catch(Exception ignored){}serverSocket=null;}
 @Override public void onRequestPermissionsResult(int code,String[] perms,int[] res){super.onRequestPermissionsResult(code,perms,res);if(code==REQ_BT)emit("permission",null);}
 public class QuizyBluetoothBridge{@JavascriptInterface public boolean isAvailable(){return adapter!=null&&hasBtPermission();}@JavascriptInterface public void host(){main.post(MainActivity.this::host);}@JavascriptInterface public void connect(String address){main.post(()->MainActivity.this.connect(address));}@JavascriptInterface public String pairedDevices(){return MainActivity.this.pairedDevices();}@JavascriptInterface public void send(String payload){MainActivity.this.send(payload);}@JavascriptInterface public String state(){return MainActivity.this.btState();}@JavascriptInterface public void requestPermission(){main.post(MainActivity.this::askBluetooth);}@JavascriptInterface public void openSettings(){main.post(MainActivity.this::openBtSettings);}@JavascriptInterface public void disconnect(){MainActivity.this.closeLink();}}
 public class QuizyClipboardBridge{@JavascriptInterface public boolean copyText(String text){try{android.content.ClipboardManager cm=(android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE);cm.setPrimaryClip(android.content.ClipData.newPlainText("Quizy room code",text==null?"":text));return true;}catch(Exception e){return false;}}}
 @Override public void onBackPressed(){if(webView.canGoBack())webView.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){try{if(socket!=null)socket.close();}catch(Exception ignored){}try{if(serverSocket!=null)serverSocket.close();}catch(Exception ignored){}io.shutdownNow();if(webView!=null)webView.destroy();super.onDestroy();}
}
