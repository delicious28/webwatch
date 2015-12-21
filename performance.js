(function (win,p) {
	
	//仅支持IE8以上的浏览器，根据是否有Performance来判断
	//IE8拥有 performance属性，但没有 getEntries 方法
	if(!p) return;
	
	
	

	var $WebWatcher ={
		 
		 userInfo:{}, //页面信息
		 pageId:document.getElementById("hidPageGuid")?document.getElementById("hidPageGuid").value:"",
		 logList:[], //日志信息
		 lastTime:0, //上次最后一条的日志记录时间,
		 isSubmiting:false,
		 timeOut:[],
		 op:{
			 isWatching:true,	//是否实时监控
			 duration:3000,		//循环提交时间
			 delay:1000,		//延迟提交时间
			 submitUrl:"/flight/flightselftripajax.aspx?type=PAGEMONITOR"
		 },
		 init:function(){
			 
			 var self=this;
			 var isUseStamp=0;
			 
			 var scriptEle=document.getElementById("scriptWatcher");
			 if(scriptEle)
			 {
				 if(scriptEle.attributes["url"] && scriptEle.attributes["url"].value)
				 {
					//获取提交地址
					this.op.submitUrl=scriptEle.attributes["url"].value;
				 }
				 
				 if(scriptEle.attributes["usestamp"] && scriptEle.attributes["usestamp"].value>0)
				 {
					isUseStamp=1;
				 }
			 }
			 
			 //获取加载失败的图片
			 this.getErrorImg();
			 
			 //记录脚本报错
			 this.getScriptError();
			 
			 //清除界面上的iframe和form
			 var iframe=document.getElementById("submitFrame");
			 var form=document.getElementById("submitForm");
			 if(iframe){iframe.parentNode.removeChild(iframe)}
			 if(form){form.parentNode.removeChild(form)}
			 
			 //初始化的时候，绑定window onload事件
			 window.addEventListener('load',function(){
			 	self.getPerformance(self,isUseStamp);
			 },false);
		 },
		 
		 getPerformance:function(self,isUseStamp){
			 
			 
			var self=self || this;
			 
			if(isUseStamp)
			{
				//开启时间戳统计
				self.WatcherStampHelper.init();
			}
			
			//重新获取pageId
			self.pageId = document.getElementById("hidPageGuid")?document.getElementById("hidPageGuid").value:"";
			 
			self.getPageInfo();
			
			setTimeout(function(){
				self.submit(true);
			},self.op.delay);
		 },
		 
		 //获取日志信息
		 getLogList:function(){   
		 
			var self=this;
			var entries=[];
			
			if(p.getEntries)
			{
				entries=p.getEntries();
			}
			
			this.logList=[]; //清空日志
			for(var i=0;i<entries.length;i++)
			{
				var entry=entries[i];
				
				//后期ajax再次提交时，只提交新生成的请求
				if(entry.startTime>self.lastTime){
					
					if(entry.initiatorType=="link")
					{
						//加载的CSS
						self.logList.push({
							"type":"css",
							"isSuccess":true,
							"duration": entry.duration,
							"requestUrl":entry.name
						});
					}
				
					else if(entry.initiatorType=="script")
					{
						//加载的JS
						self.logList.push({
							"type":"script",
							"isSuccess":true,
							"requestType":"get",
							"duration":entry.duration,
							"requestUrl":entry.name
						});
					}
					
					else if(entry.initiatorType=="xmlhttprequest")
					{
						//加载的AJAX
						self.logList.push({
							"type":"script",
							"isSuccess":true,
							"requestType":"post",
							"duration":entry.duration,
							"requestUrl":entry.name
						});
					}
					
					if(entry.startTime>self.lastTime)
					{
						self.lastTime=entry.startTime;
					}
				}
			}		 
		 }, 
		 
		 //获取页面信息
		 getPageInfo:function(){
			 var time=p.timing;
			 this.userInfo={
				userAgent: navigator.userAgent, //包含浏览器，操作系统，版本等信息
				domReady: time.domContentLoadedEventStart - time.navigationStart, //domOnLoad花费的时间，毫秒
				network: time.requestStart - time.domainLookupStart,	//请求前花费的时间
				dnsTime:time.domainLookupEnd-time.domainLookupStart,	//dns查询的时间
				send: time.responseStart - time.requestStart,			//数据发送给服务端花费的时间
				backend: time.responseEnd - time.requestStart,			//后台处理数据和返回的时间
                frontend: time.loadEventStart - time.responseEnd,	//前端拿到数据后处理的时间
				interactive: time.domInteractive - time.navigationStart,
				reffer:document.referrer || '', //referrer
				currentUrl:location.href,	//当前url
				isFirstSubmit:true
			 }
		 },
		 
		 //获取加载失败的图片
		 getErrorImg:function(){	
		 
			var allImgs=document.getElementsByTagName("img");
			var self=this;
			for(var i=0;i<allImgs.length;i++)
			{
				allImgs[i].addEventListener('error',function(e){
					if(e.target && e.target.src)
					{
						self.logList.push({
							"type":"img",
							"isSuccess":false,
							"requestUrl":e.target.src
						});
					}
				});
			}	 
		 },
		 
		 //记录脚本报错
		 getScriptError:function(){
			var self=this;
			win.onerror = function (msg, url, line) {				
				self.logList.push({
					type: "js",
					cnt: msg,
					requestUrl: url,
					line:line
				});
			}
		 },
		 
		 //跨域post提交
		 post:function(parms,callback) {
			var self=this;
			var iframe=document.getElementById("submitFrame");
			if(iframe) return;
			 
			iframe = document.createElement("iframe");	
			iframe.id="submitFrame";
			iframe.name="submitFrame";
			iframe.src="about:blank";
			iframe.style.width=0;
			iframe.style.height=0;
			iframe.style.position="fixed";
			iframe.style.top="-100px";
			iframe.style.left="-100px";
			iframe.style.opacity="0";
			document.body.appendChild(iframe);
		
			var form = document.createElement("form"); 
				form.id="submitForm";
				form.action = this.op.submitUrl;
				form.target="submitFrame";
				form.method = "post"; 
				form.style.display = "none"; 
				form.style.width=0;
				form.style.height=0;
				form.style.position="fixed";
				form.style.top="-100px";
				form.style.left="-100px";
				form.style.opacity="0";
				
				for (var x in parms) { 
					var opt = document.createElement("textarea"); 
					opt.name = x; 
					opt.value = parms[x]; 
					form.appendChild(opt); 
				}
			document.body.appendChild(form);
			
			if(this.isSubmiting)
			{
				form.submit();
			}
			
			//2秒后销毁
			setTimeout(function(){					
				iframe.parentNode.removeChild(iframe);
				form.parentNode.removeChild(form);
				self.isSubmiting=false;
				if(callback)
				{
					callback();
				}
			},2000);
		},
		
		 //提交
		 submit:function(isFirstSubmit){
			
			var self=this;			
			this.getLogList();

			if(this.logList.length>0 || isFirstSubmit)
			{		
				 //提交数据
				var logInfo = this.getLogInfo();
				
				this.userInfo.isFirstSubmit=isFirstSubmit;

				this.isSubmiting=true;
				
				this.post({"data":JSON.stringify(logInfo)});
				
				if(self.WatcherStampHelper.getStampListPageIDCount()==2)
				{
					self.WatcherStampHelper.clearStamp();
				}
				
				this.timeOut=[];
				
				//清空提交的数据
				this.logList=[];
			}
			
			if(this.op.isWatching)
			{
				setTimeout(function(){
					self.submit(false);
				},this.op.duration);
			}
		 },
		 
		 //整合提交给后端的数据
		 getLogInfo:function(){
			 
			 var logInfo= {
				logList: this.logList,
				userInfo:this.userInfo,
				pageId:this.pageId,
				lastTime:this.lastTime,
				stampList:this.WatcherStampHelper.getWatcherStampList()	//todo
			};
			
			return logInfo;
		 },
		 
		 WatcherStampHelper:{
			 
			//初始化
			init:function(){
				
				this.addEventWatcher("dom complete");
				
				//获取StampList中PageID的数量，确认是否清空localstroage
				//如果等于1说明还是当前页，清空
				//如果等于2说明跳到第二页了不清空
				//大于2的话说明到新的页面了，清空重新统计
				if(this.getStampListPageIDCount()!=2)
				{
					this.clearStamp();
				}
			},
			
			//获取StampList中PageID的数量
			getStampListPageIDCount:function(){
				var stampList=this.getWatcherStampList(),
					urlCount=0,
					stampPageIdList=[]
				
				for(var i=0;i<stampList.length;i++)
				{
					if(stampPageIdList.indexOf(stampList[i].pageId)==-1)
					{
						stampPageIdList.push(stampList[i].pageId);
					}
				}
				
				return stampPageIdList.length;
			},	
			 
			//获取自定义事件时间戳列表
			getWatcherStampList:function(){
				  var stampList=[];
				  
				  if(localStorage["airWatcherStampList"])
				  {
					  stampList=JSON.parse(localStorage["airWatcherStampList"]);
				  }

				  return stampList;
			 },
			 
			//判断是否是重复的时间戳
			checkHaveStamp:function(stampList,name,pageId){
				  
				  for(var i=0;i<stampList.length;i++)
				  {
					  if(stampList[i].name==name && stampList[i].pageId==pageId)
					  {
						  return true;
					  }
				  }
				  
				  return false;
			 },
			
			//添加自定义事件时间戳（暴露给外部）
			addCustomEventWatcher:function(stampName){
				
				var self = $WebWatcher.WatcherStampHelper;
				//debugger;
				//self.clearStamp();
				
				if(self.getStampListPageIDCount()>2)
				{
					self.clearStamp();
				}
				
				self.addEventWatcher(stampName);
			},
		 
			//添加事件时间戳
			addEventWatcher:function(stampName){
				 
				 var pageId=$WebWatcher.pageId,
					 stampList=this.getWatcherStampList();
				 
				 //如果重复的时间戳就不插了
				 if(pageId && !this.checkHaveStamp(stampList,stampName,pageId))
				 {
					 stampList.push({
						 "name":stampName,
						 "time":Date.now(),
						 "pageId":pageId
					 });
				 }
				 
				 if(stampList.length>0)
				 {
					 localStorage["airWatcherStampList"]= JSON.stringify(stampList);
				 }
			 },
		 
			//清除时间戳
			clearStamp:function(){
				localStorage.removeItem("airWatcherStampList");
			}
		 }
		 
		 
	 }
	 
	 //将添加时间戳事件暴露给前端
	 win.$WebWatcher={
		 addEventWatcher:$WebWatcher.WatcherStampHelper.addCustomEventWatcher
	 };
	 
	 $WebWatcher.getPerformance();
	 
	 $WebWatcher.init();
	 
})(window,window.performance,undefined);
