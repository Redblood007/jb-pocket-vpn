package com.jbpocketvpn;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.VpnService;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import com.wireguard.android.backend.GoBackend;
import com.wireguard.android.backend.Tunnel;
import com.wireguard.config.Config;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static final int VPN_PERMISSION = 41, CONFIG_FILE = 42;
    private static final int BG = Color.rgb(7, 5, 20), PANEL = Color.rgb(25, 19, 47);
    private static final int PURPLE = Color.rgb(174, 77, 255), MUTED = Color.rgb(174, 166, 202);
    private GoBackend backend;
    private Tunnel tunnel;
    private Config config;
    private TextView status, profileStatus, serverName, serverFlag, downloadValue, uploadValue, pingValue;
    private Button connectButton;
    private String tunnelName = "JB Pocket VPN";
    private String selectedServer = "India – Mumbai";
    private String selectedFlag = "🇮🇳";
    private String currentPage = "Home";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        backend = new GoBackend(getApplicationContext());
        tunnel = new Tunnel() {
            @Override public String getName() { return tunnelName; }
            @Override public void onStateChange(State newState) { runOnUiThread(() -> showState(newState)); }
        };
        buildUi();
        restoreSavedProfile();
    }

    private int dp(float n) { return (int)(n * getResources().getDisplayMetrics().density + .5f); }
    private GradientDrawable shape(int color, int radius, int stroke) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color); d.setCornerRadius(dp(radius));
        if (stroke != 0) d.setStroke(dp(1), stroke);
        return d;
    }
    private GradientDrawable gradient(int a, int b, int radius, int stroke) {
        GradientDrawable d = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{a,b});
        d.setCornerRadius(dp(radius)); if (stroke != 0) d.setStroke(dp(1), stroke); return d;
    }
    private TextView txt(String s, int size, int color, boolean bold) {
        TextView t = new TextView(this); t.setText(s); t.setTextSize(size); t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD); return t;
    }
    private LinearLayout column() { LinearLayout l = new LinearLayout(this); l.setOrientation(1); return l; }
    private LinearLayout row() { LinearLayout l = new LinearLayout(this); l.setOrientation(0); l.setGravity(Gravity.CENTER_VERTICAL); return l; }
    private LinearLayout.LayoutParams lp(int w, int h) { return new LinearLayout.LayoutParams(w < 0 ? w : dp(w), h < 0 ? h : dp(h)); }
    private void gap(LinearLayout parent, int height) { parent.addView(new TextView(this), lp(1,height)); }

    private TextView pill(String s, int color) {
        TextView t = txt(s, 11, color, true); t.setGravity(Gravity.CENTER);
        t.setPadding(dp(12),dp(7),dp(12),dp(7)); t.setBackground(shape(Color.rgb(39,25,67),24,Color.rgb(100,55,150))); return t;
    }
    private LinearLayout panel(int pad, int stroke) {
        LinearLayout l = column(); l.setPadding(dp(pad),dp(pad),dp(pad),dp(pad));
        l.setBackground(shape(PANEL,20,stroke)); return l;
    }
    private TextView actionTile(String icon, String title, String sub) {
        TextView t = txt(icon + "\n" + title + "\n" + sub, 13, Color.WHITE, true);
        t.setGravity(Gravity.CENTER); t.setLineSpacing(dp(3),1f); t.setPadding(dp(5),dp(12),dp(5),dp(12));
        t.setBackground(gradient(Color.rgb(48,26,78),Color.rgb(24,18,44),18,Color.rgb(91,48,139)));
        return t;
    }

    private void buildUi() {
        if (!"Home".equals(currentPage)) { buildFeaturePage(); return; }
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true); scroll.setBackgroundColor(BG);
        LinearLayout root = column(); root.setPadding(dp(18),dp(22),dp(18),dp(20)); scroll.addView(root);

        LinearLayout header = row();
        TextView menu = txt("☰",25,Color.WHITE,true); menu.setGravity(Gravity.CENTER); header.addView(menu,lp(34,48)); menu.setOnClickListener(v -> showNavigation());
        TextView shield = txt("♛\nJK",17,Color.WHITE,true); shield.setGravity(Gravity.CENTER);
        shield.setBackground(gradient(Color.rgb(92,37,160),Color.rgb(35,17,75),15,PURPLE));
        LinearLayout.LayoutParams sh=lp(52,56); sh.leftMargin=dp(7); header.addView(shield,sh);
        LinearLayout brand = column(); brand.setPadding(dp(10),0,0,0);
        brand.addView(txt("JK Pocket VPN",19,Color.WHITE,true));
        brand.addView(txt("✦  Fast • Secure • Unlimited",11,Color.rgb(196,153,255),true));
        header.addView(brand,new LinearLayout.LayoutParams(0,-2,1));
        TextView premium = pill("♛ PREMIUM",Color.rgb(255,211,111)); header.addView(premium);
        root.addView(header,lp(-1,60));

        LinearLayout hero = column(); hero.setGravity(Gravity.CENTER); hero.setPadding(0,dp(12),0,dp(8));
        TextView globe = txt("✧   ·  ·  ·  WORLD NETWORK  ·  ·  ·   ✧",12,Color.rgb(183,105,255),true);
        globe.setGravity(Gravity.CENTER); hero.addView(globe,lp(-1,38));
        connectButton = new Button(this); connectButton.setText("⏻\nTap to Connect"); connectButton.setAllCaps(false);
        connectButton.setTextSize(19); connectButton.setTypeface(Typeface.DEFAULT,Typeface.BOLD); connectButton.setTextColor(Color.WHITE);
        connectButton.setBackground(gradient(Color.rgb(84,35,142),Color.rgb(24,13,48),150,Color.rgb(208,117,255)));
        connectButton.setElevation(dp(10)); hero.addView(connectButton,lp(190,190));
        connectButton.setOnClickListener(v -> toggleTunnel());
        status = pill("●  NOT CONNECTED",Color.rgb(255,120,142));
        LinearLayout.LayoutParams st=lp(-2,42); st.topMargin=dp(15); hero.addView(status,st);
        root.addView(hero);

        LinearLayout server = panel(15,Color.rgb(139,65,218));
        LinearLayout serverRow = row();
        serverFlag=txt(selectedFlag,28,Color.WHITE,true); serverRow.addView(serverFlag,lp(46,44));
        LinearLayout serverInfo=column(); serverInfo.setPadding(dp(10),0,0,0);
        serverName=txt(selectedServer,17,Color.WHITE,true); serverInfo.addView(serverName);
        serverInfo.addView(txt("▮▮▮  BEST SPEED",11,Color.rgb(75,239,170),true));
        serverRow.addView(serverInfo,new LinearLayout.LayoutParams(0,-2,1));
        TextView choose=txt("⌄",25,Color.WHITE,true); serverRow.addView(choose);
        server.addView(serverRow); server.setOnClickListener(v -> chooseServer());
        root.addView(server,lp(-1,-2));
        TextView importLink=txt("＋ Import WireGuard profile",12,Color.rgb(200,156,255),true);
        importLink.setGravity(Gravity.CENTER); importLink.setPadding(0,dp(10),0,dp(2));
        importLink.setOnClickListener(v -> openConfigPicker()); server.addView(importLink);

        gap(root,14);
        LinearLayout stats=panel(12,Color.rgb(63,45,100)); stats.setOrientation(0);
        downloadValue=txt("↓  0.00 Mbps\nDownload",12,Color.WHITE,true);
        uploadValue=txt("↑  0.00 Mbps\nUpload",12,Color.WHITE,true);
        pingValue=txt("∿  -- ms\nPing",12,Color.WHITE,true);
        stats.addView(downloadValue,new LinearLayout.LayoutParams(0,-2,1));
        stats.addView(uploadValue,new LinearLayout.LayoutParams(0,-2,1));
        stats.addView(pingValue,new LinearLayout.LayoutParams(0,-2,1)); root.addView(stats);

        gap(root,14);
        LinearLayout plans=row();
        TextView free=actionTile("ϟ","Free Plan","100 MB / Day");
        TextView pro=actionTile("♛","Premium","Unlimited");
        TextView reward=actionTile("🎁","Earn Reward","Watch & Earn");
        free.setOnClickListener(v -> openPage("Free Plan"));
        pro.setOnClickListener(v -> openPage("Premium"));
        reward.setOnClickListener(v -> openPage("Rewards"));
        LinearLayout.LayoutParams tile=new LinearLayout.LayoutParams(0,dp(100),1); tile.setMargins(dp(3),0,dp(3),0);
        plans.addView(free,tile); plans.addView(pro,tile); plans.addView(reward,tile); root.addView(plans);

        gap(root,12);
        LinearLayout tools=row();
        String[][] items={{"▤","All Servers"},{"◴","Speed Test"},{"♢","IP Check"},{"▦","More"}};
        for(String[] item:items){ TextView t=txt(item[0]+"\n"+item[1],12,Color.WHITE,true); t.setGravity(Gravity.CENTER);
            t.setBackground(shape(Color.rgb(27,22,49),16,Color.rgb(57,45,88)));
            LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(76),1); p.setMargins(dp(3),0,dp(3),0); tools.addView(t,p);
            t.setOnClickListener(v -> { if(item[1].equals("All Servers")) chooseServer(); else Toast.makeText(this,item[1]+" will be available in a later app update.",Toast.LENGTH_SHORT).show(); });
        }
        root.addView(tools);
        gap(root,14);
        profileStatus=txt("WireGuard profile: not imported",11,MUTED,false); profileStatus.setGravity(Gravity.CENTER); root.addView(profileStatus,lp(-1,25));

        LinearLayout nav=panel(10,Color.rgb(76,54,116)); nav.setOrientation(0);
        String[] navs={"⌂\nHome","♛\nPlans","♧\nRewards","♙\nProfile"};
        for(int i=0;i<navs.length;i++){ TextView n=txt(navs[i],12,i==0?Color.rgb(204,140,255):MUTED,true); n.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(54),1); nav.addView(n,p); }
        root.addView(nav,lp(-1,74));
        setContentView(scroll);
    }


    private void openPage(String page) { currentPage=page; buildUi(); }
    @Override public void onBackPressed() {
        if (!"Home".equals(currentPage)) { currentPage="Home"; buildUi(); }
        else super.onBackPressed();
    }
    private void showNavigation() {
        String[] pages={"Home","Servers","Premium","Rewards","Profile","Settings","Help & Support","About"};
        new AlertDialog.Builder(this).setTitle("JK Pocket VPN").setItems(pages,(d,i)->{
            if ("Servers".equals(pages[i])) chooseServer(); else openPage(pages[i]);
        }).show();
    }
    private void addPageButton(LinearLayout root,String label,Runnable action) {
        TextView b=txt(label+"    ›",15,Color.WHITE,true); b.setPadding(dp(16),dp(15),dp(12),dp(15));
        b.setBackground(shape(PANEL,16,Color.rgb(79,48,116)));
        LinearLayout.LayoutParams p=lp(-1,-2); p.bottomMargin=dp(9); root.addView(b,p);
        b.setOnClickListener(v->action.run());
    }
    private void buildFeaturePage() {
        ScrollView scroll=new ScrollView(this); scroll.setBackgroundColor(BG);
        LinearLayout root=column(); root.setPadding(dp(18),dp(22),dp(18),dp(24)); scroll.addView(root);
        LinearLayout header=row();
        TextView back=txt("‹",32,Color.WHITE,true); header.addView(back,lp(42,48)); back.setOnClickListener(v->{currentPage="Home";buildUi();});
        TextView title=txt(currentPage,21,Color.WHITE,true); header.addView(title);
        root.addView(header,lp(-1,56)); gap(root,12);
        switch(currentPage) {
            case "Servers":
                root.addView(txt("Choose your VPN location",17,Color.WHITE,true)); gap(root,10);
                String[] locations={"🇮🇳  India – Mumbai","🇮🇳  India – Delhi","🇸🇬  Singapore","🇩🇪  Germany","🇺🇸  United States","🇬🇧  United Kingdom"};
                for(String location:locations) addPageButton(root,location,()->{
                    selectedServer=location.substring(4); selectedFlag=location.substring(0,4).trim();
                    currentPage="Home";buildUi(); Toast.makeText(this,"Selected "+selectedServer+". Import a matching server profile to connect.",Toast.LENGTH_LONG).show();
                });
                break;
            case "Premium":
                root.addView(txt("Upgrade your VPN experience",18,Color.WHITE,true));
                root.addView(txt("Plan selection preview. Payments are not enabled in this app build.",13,MUTED,false)); gap(root,12);
                for(String plan:new String[]{"7 Days  •  ₹49","30 Days  •  ₹149","90 Days  •  ₹399","365 Days  •  ₹1,299"}) addPageButton(root,plan,()->openPage("Payment"));
                break;
            case "Payment":
                root.addView(txt("Payment methods",18,Color.WHITE,true)); gap(root,10);
                for(String method:new String[]{"UPI / PhonePe / Google Pay","Paytm","Card / Net Banking"}) addPageButton(root,method,()->new AlertDialog.Builder(this).setTitle("Payment not enabled").setMessage("The payment gateway is not connected yet. No payment has been taken.").setPositiveButton("OK",null).show());
                break;
            case "Profile":
                root.addView(txt("Your account",18,Color.WHITE,true)); gap(root,8);
                root.addView(txt("Sign-in and account sync will be added after the core VPN connection is verified.",13,MUTED,false)); gap(root,10);
                addPageButton(root,"Subscription",()->openPage("Premium"));
                addPageButton(root,"Settings",()->openPage("Settings"));
                addPageButton(root,"Help & Support",()->openPage("Help & Support"));
                break;
            case "Settings":
                root.addView(txt("App preferences",18,Color.WHITE,true)); gap(root,10);
                for(String setting:new String[]{"Auto Connect","Notifications","Dark Theme","App Information"}) addPageButton(root,setting,()->new AlertDialog.Builder(this).setTitle(setting).setMessage("This setting is a UI placeholder and is not active yet.").setPositiveButton("OK",null).show());
                break;
            case "Rewards":
            case "Free Plan":
                root.addView(txt("Free plan",18,Color.WHITE,true));
                root.addView(txt("The 100 MB daily quota is not enforced yet. Usage and reward systems are not active.",13,MUTED,false)); gap(root,12);
                addPageButton(root,"View Premium Plans",()->openPage("Premium"));
                break;
            case "Help & Support":
                root.addView(txt("Help & Support",18,Color.WHITE,true)); gap(root,10);
                for(String topic:new String[]{"How to import a WireGuard profile","VPN connection troubleshooting","Contact support"}) addPageButton(root,topic,()->new AlertDialog.Builder(this).setTitle(topic).setMessage("Support content will be added in a later update.").setPositiveButton("OK",null).show());
                break;
            default:
                root.addView(txt("JK Pocket VPN Ultra Premium",18,Color.WHITE,true));
                root.addView(txt("Native Android WireGuard client. Import a valid .conf profile on the Home screen to connect.",13,MUTED,false));
        }
        gap(root,16);
        TextView home=txt("←  Back to Dashboard",14,Color.rgb(207,157,255),true); home.setGravity(Gravity.CENTER);
        root.addView(home,lp(-1,52)); home.setOnClickListener(v->{currentPage="Home";buildUi();});
        setContentView(scroll);
    }

    private void chooseServer() {
        String[] names={"🇮🇳  India – Mumbai","🇮🇳  India – Delhi","🇸🇬  Singapore","🇺🇸  United States","🇬🇧  United Kingdom","🇩🇪  Germany"};
        String[] flags={"🇮🇳","🇮🇳","🇸🇬","🇺🇸","🇬🇧","🇩🇪"};
        String[] clean={"India – Mumbai","India – Delhi","Singapore","United States","United Kingdom","Germany"};
        new AlertDialog.Builder(this).setTitle("Choose VPN location").setItems(names,(d,which)->{
            selectedServer=clean[which]; selectedFlag=flags[which]; serverName.setText(selectedServer); serverFlag.setText(selectedFlag);
            Toast.makeText(this,"Selected "+selectedServer+". A matching server profile is still required.",Toast.LENGTH_LONG).show();
        }).setNegativeButton("Cancel",null).show();
    }

    private void openConfigPicker() {
        Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(i,CONFIG_FILE);
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==CONFIG_FILE && resultCode==RESULT_OK && data!=null && data.getData()!=null) {
            try {
                getContentResolver().takePersistableUriPermission(data.getData(),data.getFlags()&Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try(BufferedReader r=new BufferedReader(new InputStreamReader(getContentResolver().openInputStream(data.getData()),StandardCharsets.UTF_8))){config=Config.parse(r);}
                getSharedPreferences("vpn_profile",MODE_PRIVATE).edit().putString("config_uri",data.getData().toString()).apply();
                profileStatus.setText("✓ WireGuard profile imported • Ready to connect");
                Toast.makeText(this,"WireGuard profile imported",Toast.LENGTH_SHORT).show();
            } catch(Exception e) { config=null; profileStatus.setText("Could not read WireGuard profile"); Toast.makeText(this,"Invalid config: "+safeErrorMessage(e),Toast.LENGTH_LONG).show(); }
        } else if(requestCode==VPN_PERMISSION) {
            if(resultCode==RESULT_OK) startTunnel(); else showConnectionError("VPN permission required");
        }
    }
    private void restoreSavedProfile() {
        String uri=getSharedPreferences("vpn_profile",MODE_PRIVATE).getString("config_uri",null); if(uri==null)return;
        try(BufferedReader r=new BufferedReader(new InputStreamReader(getContentResolver().openInputStream(android.net.Uri.parse(uri)),StandardCharsets.UTF_8))){
            config=Config.parse(r); profileStatus.setText("✓ Saved WireGuard profile • Ready to connect");
        } catch(Exception e){config=null;getSharedPreferences("vpn_profile",MODE_PRIVATE).edit().remove("config_uri").apply();}
    }
    private void toggleTunnel() {
        if(config==null){Toast.makeText(this,"Import a valid WireGuard .conf profile first.",Toast.LENGTH_LONG).show();openConfigPicker();return;}
        try {
            if(backend.getState(tunnel)==Tunnel.State.UP){backend.setState(tunnel,Tunnel.State.DOWN,null);showState(backend.getState(tunnel));}
            else {Intent p=VpnService.prepare(this);if(p!=null)startActivityForResult(p,VPN_PERMISSION);else startTunnel();}
        } catch(Exception e){showConnectionError("CONNECTION FAILED");Toast.makeText(this,safeErrorMessage(e),Toast.LENGTH_LONG).show();}
    }
    private void startTunnel() {
        if(config==null){showConnectionError("PROFILE REQUIRED");return;}
        try {backend.setState(tunnel,Tunnel.State.UP,config);Tunnel.State s=backend.getState(tunnel);showState(s);
            if(s!=Tunnel.State.UP)throw new IllegalStateException("WireGuard did not confirm connection");
        } catch(Exception e){showConnectionError("CONNECTION FAILED");Toast.makeText(this,safeErrorMessage(e),Toast.LENGTH_LONG).show();}
    }
    private void showConnectionError(String s){status.setText("●  "+s);status.setTextColor(Color.rgb(255,110,130));connectButton.setText("⏻\nTap to Connect");}
    private String safeErrorMessage(Exception e){return e.getMessage()==null?e.getClass().getSimpleName():e.getMessage();}
    @Override protected void onResume(){super.onResume();if(backend!=null&&tunnel!=null&&status!=null)try{showState(backend.getState(tunnel));}catch(Exception e){showConnectionError("STATUS UNAVAILABLE");}}
    private void showState(Tunnel.State s) {
        boolean up=s==Tunnel.State.UP; status.setText(up?"●  CONNECTED":"●  NOT CONNECTED");
        status.setTextColor(up?Color.rgb(72,240,165):Color.rgb(255,120,145));
        connectButton.setText(up?"⏻\nTap to Disconnect":"⏻\nTap to Connect");
    }
}