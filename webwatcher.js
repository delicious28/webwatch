/*
     ******=**Web监控**********
     1、可以检测Img是否加载成功
     2、记录所有JS的错误信息
     3、支持实时监控(默认关闭)，后期动态添加图片也能被监控到 $WebWatcher.opt.isWatching 需要手动设置成true
     4、可监控所有通过fish请求的ajax，成功失败都会记录
     ps:需要fish的支持，木有的话不会运行
*/
(function (win) {

    if (!win.$WebWatcher && win.fish) {

        var pageStartTime = new Date().getTime();

        var $WebWatcher = {
            opt: {
                isWatching: true, //是否实时监控(如果新加的图片加载失败，也能监控到，会调用setInterval，有一定的消耗)
                isWatchImg: true,
                isWatchJs: true,
                isWatchAjax:true,
                isHttps: false, //如果是https不上传,
                isSubmiting: false, //是否正在提交
                intervalSubmitTime: 3000, //默认每3S检测一下是否有没有提交的数据
                intervalCheckTime: 20, //循环检测时间，毫秒
				isSubmited:false,
                submitUrl: "/flight/flightselftripajax.aspx?type=PAGEMONITOR"
            },

            userInfo: {},
            logList: [],
			imgList:[],

            //初始化
            init: function () {

                var self = this;

                //清空错误信息
                this.logList = [];

                this.userInfo = {

                    userAgent: navigator.userAgent, //包含浏览器，操作系统，版本等信息
                    domOnLoadTime: 0, //domOnLoad花费的时间，毫秒
                    pageOnloadTime: 0, //pageonload花费的时间，毫秒
                    reffer:document.reffer || '', //referrer
					currentUrl:location.href	//当前url
                    //还需要什么信息后期添加
                }

                fish.ready(function () {
                    self.userInfo.domOnLoadTime = (new Date().getTime() - pageStartTime);
                });

                fish.loaded(function () {
                    self.userInfo.pageOnloadTime = (new Date().getTime() - pageStartTime);
                });

                //判断是否是https
                this.opt.isHttps = /^https/.test(win.location);

            },

            //启动监控
            start: function () {

                //如果是https的，就不玩了
                if (!this.opt.isHttps) {

                    //初始化，获取用户信息
                    this.init();

                    var self = this;

                    if (this.opt.isWatchImg) {

                        fish.ready(function () {
                            self.watchImg();
                        });
                    }

                    if (this.opt.isWatchJs) {
                        this.watchJs();
                    }

                    if (this.opt.isWatchAjax) {
                        this.watchAjax();
                    }

                    if (this.opt.isWatching) {
                        
						//开启实时监控
                        setInterval(function () {
                            self.watchImg();
                        }, this.opt.intervalCheckTime);
						
						//循环submit
						setInterval(function () {
                            self.submit();
                        }, this.opt.intervalSubmitTime);
                    }
                }
            },

            //监控JS报错
            watchJs: function () {

                win.onerror = function (msg, url, line) {

                    $WebWatcher.add({
                        type: "js",
                        cnt: msg,
                        requestUrl: url,
                        line:line
                    });
                }

            },

            //监控图片加载
            watchImg: function () {
				
				
                fish.all("img").on("error", function (e) {
					
					if($WebWatcher.imgList.indexOf(e.target.src)==-1)
					{
						 $WebWatcher.add({
							type: "img",
							isSuccess:false,
							requestUrl: e.target.src
						});
						$WebWatcher.imgList.push(e.target.src);
					}
                });
            },

            //ajax监控
            watchAjax: function () {
                function ajaxLog(ajax) {
					try{
                        $WebWatcher.add({
                            type: "ajax",
                            isSuccess: ajax.isSuccess,
                            costTime: ajax.costTime || 0,
                            cnt: ajax.cnt || '',
                            requestUrl: ajax.requestUrl || '',
                            requestType: ajax.requestType || 'get',
                            responseCode:ajax.responseCode,
                            pageUrl:location.href
                        });
                    }
                    catch(e)
                    {

                    }
                };

                win.fish.ajax = function (param) {
                        var xmlhttp = window.ActiveXObject ? new ActiveXObject("Microsoft.XMLHTTP") : new XMLHttpRequest(),
                            type = param.type ? param.type : "string",
                            openType = param.openType ? param.openType : "get",
                            fn = param.fn,
                            err = param.err,
                            data = param.data,
                            onTimeout = param.onTimeout,
                            async = param.sync === true ? false : true,
                            timeout = param.timeout ? param.timeout : 16000,
                            isErrFunExc = false,	// 错误回调是否执行过，保证错误回调只执行一次
                            urlSend = param.url,
                            ajaxStartTime = new Date().getTime(),
                            costTime=0,
                            finalUrl;
                        if (!urlSend) {
                            return;
                        }
                        // clearTimeout(param.timer);
                        function onreadystatechange() {
                          
                            if (xmlhttp.readyState == 4 &&
                                    ((xmlhttp.status >= 200 && xmlhttp.status <= 300) || xmlhttp.status == 304)) {
                                clearTimeout(param.timer);
                                var data = xmlhttp.responseText;

                                //alert(xmlhttp.status);

                                ajaxLog({
                                    isSuccess: true,
                                    costTime: (new Date().getTime() - ajaxStartTime),
                                    cnt: "ajax Success, spend " + costTime + " millisecond",
                                    requestUrl:param.url,
                                    requestType: param.openType,
                                    responseCode: xmlhttp.status
                                });

                                if (type === "json") {
                                    data = function(){return data};
                                }
                                fn && fn(data);
                                param.cache && (ajaxCaches[urlSend] = data);
                            } else if (xmlhttp.readyState == 4) {
                                clearTimeout(param.timer);
                                if (!isErrFunExc) {

                                    ajaxLog({
                                        isSuccess: false,
                                        costTime: (new Date().getTime() - ajaxStartTime),
                                        cnt: "ajax Error",
                                        requestUrl: param.url,
                                        requestType: param.openType,
                                        responseCode: xmlhttp.status
                                    });

                                    err && err();
                                    isErrFunExc = true;
                                }
                            }
                        }
                        if (urlSend.indexOf("#") > 0) {           //  判断有没有"#"  ，有的话  去掉"#"后面所有字符
                            urlSend = urlSend.substring(0, urlSend.indexOf("#"));
                        }
                        if (urlSend.indexOf("?") > 0 && urlSend.indexOf("?") == urlSend.length - 1) {           //  去掉最后一个问号
                            urlSend = urlSend.substring(0, urlSend.indexOf("?"));
                        }
                        function fixUrlSend(urlSend, data) {
                            var urlD = urlSend;
                            if (data) {          //  没有问号  在最后面加上问号
                                if (urlSend.indexOf("?") < 0) {
                                    urlD = urlD + "?";
                                }
                                else if (urlSend.charAt(urlSend.length - 1) != "?") {            //  如果有问题后 切问号不在最后面  加上"&"
                                    urlD = urlD + "&";
                                }
                                urlD = urlD + data;
                            }
                            return urlD;
                        }
                        function setHeaders() {
                            xmlhttp.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                            if (!param.headers) {
                                return;
                            }
                            for (var i in param.headers) {
                                xmlhttp.setRequestHeader(i, param.headers[i]);
                            }
                        }
                        var isJsonp = false,
                            isJsonpDone = false,
                            isAjax = false;
                        if (param.type === "jsonp") {
                            urlSend = fixUrlSend(urlSend, param.data);
                            isJsonp = true;
                            var RandomFn = param.jsonpCallback ? param.jsonpCallback : ("tc" + parseInt(100000000000 * Math.random()));
                            finalUrl = fixUrlSend(urlSend, (typeof param.jsonp === "string" && param.jsonp !== "" ? param.jsonp : "callback") + "=" + RandomFn);

                            if (param.jsonpCallback) {
                                if (param.cache) {
                                    if (ajaxCaches[urlSend] !== undefined) {
                                        window[RandomFn](ajaxCaches[urlSend]);
                                        return;
                                    }
                                } else {
                                    finalUrl += "&iid=" + new Date().getTime();
                                }
                            }
                            var callback = window[RandomFn];
                            window[RandomFn] = function (e) {
                                if (!isJsonpDone) {
                                    fn && fn(e);
                                    if (callback) {
                                        callback(e);
                                        window[RandomFn] = callback;
                                    } else {
                                        window[RandomFn] = undefined;
                                    }

                                    costTime = (new Date().getTime() - ajaxStartTime);

                                    ajaxLog({
                                        isSuccess: true,
                                        costTime: costTime,
                                        cnt: "ajax Success, spend " + costTime + " millisecond",
                                        requestUrl: param.url,
                                        requestType: "jsonp",
                                        responseCode: xmlhttp.status
                                    });

                                    if (param.cache && ajaxCaches[urlSend] === undefined) {
                                        ajaxCaches[urlSend] = e;
                                    }
                                    clearTimeout(param.timer);
                                }
                            };
                            var creScr = document.createElement("script");
                            creScr.type = "text/javascript";
                            creScr.src = finalUrl;
                            creScr.async = async;
                            document.getElementsByTagName("head")[0].appendChild(creScr);
                        }
                        else if (param.type === "script") {
                            urlSend = fixUrlSend(urlSend, param.data);
                            var creScr = document.createElement("script");
                            creScr.type = "text/javascript";
                            creScr.onreadystatechange = creScr.onload = function () {
                                var state = creScr.readyState;
                                if (!state || /loaded|complete/.test(state)) {
                                    creScr.onreadystatechange = creScr.onload = null;
                                    fn && typeof fn === "function" && fn();
                                }
                            };
                            creScr.src = urlSend;
                            creScr.async = async;
                            document.getElementsByTagName("head")[0].appendChild(creScr);
                        } else if (openType === "get") {
                            urlSend = fixUrlSend(urlSend, param.data);
                            isAjax = true;
                            finalUrl = urlSend;
                            if (!param.cache) {
                                finalUrl = fixUrlSend(urlSend, "iid=" + Math.random());
                            }
                            else {
                                if (ajaxCaches[urlSend] !== undefined) {
                                    param.fn && param.fn(ajaxCaches[urlSend]);
                                    return;
                                }
                            }
                            xmlhttp.open(openType, finalUrl, async);
                            xmlhttp.onreadystatechange = onreadystatechange;
                            setHeaders();
                            xmlhttp.send(null);
                        } else if (openType === "post") {
                            isAjax = true;
                            xmlhttp.open(openType, urlSend, async);
                            xmlhttp.onreadystatechange = onreadystatechange;
                            xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                            setHeaders();
                            xmlhttp.send(param.data);
                        }

                        //            if(!error){
                        param.timer = setTimeout(function () {
                            if (isAjax && xmlhttp.readyState !== 4) {
                                onTimeout && onTimeout();
                                xmlhttp.abort();
                                if (!isErrFunExc) {

                                    ajaxLog({
                                        isSuccess: false,
                                        costTime: (new Date().getTime() - ajaxStartTime),
                                        cnt: "ajax TimeOut",
                                        requestUrl: param.url,
                                        requestType: param.openType,
                                        responseCode: xmlhttp.status
                                    });

                                    err && err();
                                    isErrFunExc = true;
                                }
                            }
                            if (isJsonp && !isErrFunExc) {

                                ajaxLog({
                                    isSuccess: false,
                                    costTime: (new Date().getTime() - ajaxStartTime),
                                    cnt: "ajax Error",
                                    requestUrl: param.url,
                                    requestType: param.openType,
                                    responseCode: xmlhttp.status
                                });

                                err && err();
                                isJsonpDone = true;
                                isErrFunExc = true;
                            }
                        }, timeout);

                        return xmlhttp;
                    }
            },

            //添加错误信息到数组
            add: function (error) {

                this.logList.push(error);

            },

            //提交监控数据
            submit: function () {

                if (this.logList.length > 0 && !this.opt.isSubmiting) {
					
					this.userInfo.isFirstSubmit=!this.opt.isSubmited;
					
                    //提交数据
                    var logInfo = {
                        logList: this.unique(this.logList),
						userInfo:this.userInfo
                    };				
					
					this.post({"data":JSON.stringify(logInfo)});
					
					this.opt.isSubmited=true;
					
					this.logList=[];
					
                    //console.log(JSON.stringify(logInfo));
                }
            },
			
			
			//跨域post提交
			post:function(prams) {
				var iframe = document.createElement("iframe");	
					iframe.id="submitFrame";
					iframe.name="submitFrame";
					iframe.src="about:blank";
					iframe.style.width=0;
					iframe.style.height=0;
					
				document.body.appendChild(iframe);
			
				var form = document.createElement("form"); 
					form.action = this.opt.submitUrl;
					form.target="submitFrame";
					form.method = "post"; 
					form.style.display = "none"; 
					
					for (var x in prams) { 
						var opt = document.createElement("textarea"); 
						opt.name = x; 
						opt.value = prams[x]; 
						form.appendChild(opt); 
					}
				document.body.appendChild(form); 
				form.submit(); 
				
				//2秒后销毁
				setTimeout(function(){					
					iframe.parentNode.removeChild(iframe);
					form.parentNode.removeChild(form);
				},2000);
			},
			
			//合并错误信息
			unique:function(list) {
				try {
					list.sort();
					var re = [list[0]];
					for (var i = 1; i < list.length; i++) {

						var item = list[i];

						if(re.indexOf(item)==-1)
						{
							re.push(item);
						}
					}
					return re;
				}
				catch (e) {
					//console.log(e);
				}
			}
        }
    }

    try {
        //默认启动
        $WebWatcher.start();
		
		win.$WebWatcher=$WebWatcher;
    }
    catch (e) {
		//alert(e);
	}

})(window);
