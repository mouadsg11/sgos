package com.sgos.personal;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SgosNativePlugin.class);   // impression PDF et enregistrement de fichiers
        super.onCreate(savedInstanceState);
    }
}
